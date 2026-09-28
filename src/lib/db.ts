import { Pool } from 'pg';

let pool: Pool | null = null;
let isPgConnected = false;

// In-Memory Fallback Store if live PostgreSQL instance is unreachable during dev
const memoryStore: {
  topics: any[];
  student_profile: any[];
  user_bookmarks: any[];
  user_notes: any[];
  quiz_attempts: any[];
} = {
  topics: [],
  student_profile: [],
  user_bookmarks: [],
  user_notes: [],
  quiz_attempts: []
};

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/eduverse';
    pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 3000,
    });
  }
  return pool;
}

function convertPlaceholders(sql: string): string {
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

export async function getDb() {
  const p = getPool();
  
  // Try connecting & initializing PostgreSQL tables
  if (!isPgConnected) {
    try {
      const client = await p.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS topics (
            id VARCHAR(100) PRIMARY KEY,
            grade INTEGER,
            subjectId VARCHAR(50),
            subjectName VARCHAR(100),
            category VARCHAR(100),
            title VARCHAR(200),
            subtitle TEXT,
            xpReward INTEGER,
            estimatedTime VARCHAR(50),
            badge VARCHAR(100),
            theorySummary TEXT,
            engineType VARCHAR(50),
            questionsJson TEXT
          );

          CREATE TABLE IF NOT EXISTS student_profile (
            id INTEGER PRIMARY KEY DEFAULT 1,
            name VARCHAR(100),
            grade INTEGER,
            avatar VARCHAR(20),
            level INTEGER,
            totalXp INTEGER,
            streakDays INTEGER,
            topicsCompletedCount INTEGER,
            quizAccuracy INTEGER
          );

          CREATE TABLE IF NOT EXISTS user_bookmarks (
            topicId VARCHAR(100) PRIMARY KEY,
            createdAt VARCHAR(100)
          );

          CREATE TABLE IF NOT EXISTS user_notes (
            id VARCHAR(100) PRIMARY KEY,
            topicId VARCHAR(100),
            text TEXT,
            createdAt VARCHAR(100)
          );

          CREATE TABLE IF NOT EXISTS quiz_attempts (
            id SERIAL PRIMARY KEY,
            topicId VARCHAR(100),
            score INTEGER,
            totalQuestions INTEGER,
            xpEarned INTEGER,
            attemptedAt VARCHAR(100)
          );
        `);

        // Check if student profile exists
        const profRes = await client.query('SELECT * FROM student_profile WHERE id = 1');
        if (profRes.rowCount === 0) {
          await client.query(`
            INSERT INTO student_profile (id, name, grade, avatar, level, totalXp, streakDays, topicsCompletedCount, quizAccuracy)
            VALUES (1, 'Alex Rivera', 9, '🎓', 4, 320, 7, 5, 88)
          `);
        }

        // Check topics count
        const topicsCountRes = await client.query('SELECT COUNT(*) as count FROM topics');
        const count = parseInt(topicsCountRes.rows[0].count, 10);
        if (count < 70) {
          await seedCurriculumTopicsPg(client);
        }

        isPgConnected = true;
      } finally {
        client.release();
      }
    } catch (err) {
      console.warn('PostgreSQL connection failed, using in-memory store fallback:', (err as Error).message);
      if (memoryStore.topics.length === 0) {
        initMemoryStore();
      }
    }
  }

  return {
    async query(sql: string, params: any[] = []) {
      const pgSql = convertPlaceholders(sql);
      if (isPgConnected) {
        return await p.query(pgSql, params);
      }
      return executeMemoryQuery(sql, params);
    },
    async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
      const pgSql = convertPlaceholders(sql);
      if (isPgConnected) {
        const res = await p.query(pgSql, params);
        return res.rows[0] as T;
      }
      const rows = executeMemoryQuery(sql, params);
      return rows[0] as T;
    },
    async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
      const pgSql = convertPlaceholders(sql);
      if (isPgConnected) {
        const res = await p.query(pgSql, params);
        return res.rows as T[];
      }
      return executeMemoryQuery(sql, params) as T[];
    },
    async run(sql: string, params: any[] = []) {
      const pgSql = convertPlaceholders(sql);
      if (isPgConnected) {
        const res = await p.query(pgSql, params);
        return { rowCount: res.rowCount };
      }
      executeMemoryRun(sql, params);
      return { rowCount: 1 };
    }
  };
}

// In-Memory Query executor fallback
function executeMemoryQuery(sql: string, params: any[]) {
  const upper = sql.trim().toUpperCase();
  if (upper.includes('FROM TOPICS')) {
    let result = [...memoryStore.topics];
    if (upper.includes('WHERE')) {
      if (params.length === 2) {
        result = result.filter(t => t.grade === params[0] && t.subjectId === params[1]);
      } else if (params.length === 1) {
        if (typeof params[0] === 'number') {
          result = result.filter(t => t.grade === params[0]);
        } else {
          result = result.filter(t => t.subjectId === params[0]);
        }
      }
    }
    return result;
  }
  if (upper.includes('FROM STUDENT_PROFILE')) {
    return memoryStore.student_profile;
  }
  if (upper.includes('FROM USER_BOOKMARKS')) {
    if (upper.includes('WHERE TOPICID')) {
      return memoryStore.user_bookmarks.filter(b => b.topicId === params[0]);
    }
    return memoryStore.user_bookmarks;
  }
  if (upper.includes('FROM USER_NOTES')) {
    let result = [...memoryStore.user_notes];
    if (params.length > 0 && params[0]) {
      result = result.filter(n => n.topicId === params[0]);
    }
    return result;
  }
  return [];
}

function executeMemoryRun(sql: string, params: any[]) {
  const upper = sql.trim().toUpperCase();
  if (upper.startsWith('INSERT INTO USER_NOTES')) {
    memoryStore.user_notes.unshift({ id: params[0], topicId: params[1], text: params[2], createdAt: params[3] });
  } else if (upper.startsWith('INSERT INTO USER_BOOKMARKS')) {
    memoryStore.user_bookmarks.push({ topicId: params[0], createdAt: params[1] });
  } else if (upper.startsWith('DELETE FROM USER_BOOKMARKS')) {
    memoryStore.user_bookmarks = memoryStore.user_bookmarks.filter(b => b.topicId !== params[0]);
  } else if (upper.startsWith('UPDATE STUDENT_PROFILE')) {
    if (memoryStore.student_profile[0]) {
      memoryStore.student_profile[0].totalXp += (params[0] || 0);
      memoryStore.student_profile[0].topicsCompletedCount += 1;
    }
  } else if (upper.startsWith('INSERT INTO QUIZ_ATTEMPTS')) {
    memoryStore.quiz_attempts.push({ topicId: params[0], score: params[1], totalQuestions: params[2], xpEarned: params[3], attemptedAt: params[4] });
  }
}

function initMemoryStore() {
  memoryStore.student_profile = [
    { id: 1, name: 'Alex Rivera', grade: 9, avatar: '🎓', level: 4, totalXp: 320, streakDays: 7, topicsCompletedCount: 5, quizAccuracy: 88 }
  ];
  memoryStore.topics = getFullCurriculumTopicsData().map(t => ({
    ...t,
    questionsJson: JSON.stringify(t.questions)
  }));
}

async function seedCurriculumTopicsPg(client: any) {
  await client.query('DELETE FROM topics');
  const allTopics = getFullCurriculumTopicsData();
  for (const item of allTopics) {
    await client.query(
      `INSERT INTO topics (id, grade, subjectId, subjectName, category, title, subtitle, xpReward, estimatedTime, badge, theorySummary, engineType, questionsJson)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        item.id,
        item.grade,
        item.subjectId,
        item.subjectName,
        item.category,
        item.title,
        item.subtitle,
        item.xpReward,
        item.estimatedTime,
        item.badge,
        item.theorySummary,
        item.engineType,
        JSON.stringify(item.questions)
      ]
    );
  }
}

export function getFullCurriculumTopicsData() {
  return [
    // ══════════════════════════════════════════════════════════════
    // CLASS 6 (Grades 6) — 5 Subjects x 2 Topics = 10 Topics
    // ══════════════════════════════════════════════════════════════
    {
      id: 'bio-6-plants',
      grade: 6,
      subjectId: 'bio',
      subjectName: 'Biology',
      category: 'Plant Biology',
      title: 'Parts of a Plant & Photosynthesis',
      subtitle: 'Explore roots, stems, leaves, flowers and how plants make food using sunlight.',
      xpReward: 90,
      estimatedTime: '15 mins',
      badge: '🌿 Green Scientist',
      engineType: 'biocell',
      theorySummary: 'Plants are living organisms that make their own food through photosynthesis. They absorb water via roots, transport it through stems, and use chlorophyll in leaves to convert sunlight + CO₂ into glucose and oxygen.',
      questions: [
        { id: 1, question: 'Which part of the plant absorbs water from the soil?', options: ['Leaf', 'Stem', 'Root', 'Flower'], correctIndex: 2, explanation: 'Roots absorb water and dissolved minerals from the soil.' },
        { id: 2, question: 'What green pigment in leaves helps in photosynthesis?', options: ['Melanin', 'Chlorophyll', 'Keratin', 'Haemoglobin'], correctIndex: 1, explanation: 'Chlorophyll captures light energy for photosynthesis.' }
      ]
    },
    {
      id: 'bio-6-animals',
      grade: 6,
      subjectId: 'bio',
      subjectName: 'Biology',
      category: 'Animal Kingdom',
      title: 'Classification of Animals & Their Habitats',
      subtitle: 'Discover vertebrates, invertebrates, and how animals adapt to environments.',
      xpReward: 100,
      estimatedTime: '18 mins',
      badge: '🦁 Zoologist',
      engineType: 'biocell',
      theorySummary: 'Animals are divided into Vertebrates (with backbone — fish, amphibians, reptiles, birds, mammals) and Invertebrates (without backbone). Classification is based on body structure and adaptation.',
      questions: [
        { id: 1, question: 'Which animal is a vertebrate?', options: ['Earthworm', 'Butterfly', 'Frog', 'Snail'], correctIndex: 2, explanation: 'Frogs have a vertebral backbone.' },
        { id: 2, question: 'What is a key feature of mammals?', options: ['They lay eggs', 'Feed young with milk', 'Have scales', 'Breathe through gills'], correctIndex: 1, explanation: 'Mammals nurse their young with milk.' }
      ]
    },
    {
      id: 'chem-6-matter',
      grade: 6,
      subjectId: 'chem',
      subjectName: 'Chemistry',
      category: 'States of Matter',
      title: 'Solids, Liquids & Gases — States of Matter',
      subtitle: 'Learn how matter changes state through heating, cooling, melting and evaporation.',
      xpReward: 95,
      estimatedTime: '15 mins',
      badge: '💧 Matter Explorer',
      engineType: 'chemistry',
      theorySummary: 'Matter exists in three primary states: Solid, Liquid, and Gas. Solid has fixed volume and shape; Liquid has fixed volume; Gas has no fixed shape or volume.',
      questions: [
        { id: 1, question: 'What is liquid converting to gas called?', options: ['Melting', 'Freezing', 'Evaporation', 'Condensation'], correctIndex: 2, explanation: 'Evaporation is the transition from liquid to gas.' },
        { id: 2, question: 'In which state do particles vibrate in fixed positions?', options: ['Solid', 'Liquid', 'Gas', 'Plasma'], correctIndex: 0, explanation: 'Solid particles have fixed closely packed positions.' }
      ]
    },
    {
      id: 'chem-6-mixtures',
      grade: 6,
      subjectId: 'chem',
      subjectName: 'Chemistry',
      category: 'Pure Substances',
      title: 'Elements, Compounds & Mixtures',
      subtitle: 'Differentiate between pure substances, homogeneous and heterogeneous mixtures.',
      xpReward: 110,
      estimatedTime: '20 mins',
      badge: '⚗️ Lab Apprentice',
      engineType: 'chemistry',
      theorySummary: 'Elements consist of identical atoms. Compounds consist of chemically combined elements. Mixtures are physical combinations that can be physically separated.',
      questions: [
        { id: 1, question: 'Which substance contains only ONE type of atom?', options: ['Compound', 'Mixture', 'Element', 'Solution'], correctIndex: 2, explanation: 'An element contains only one atom type.' },
        { id: 2, question: 'How can iron filings be separated from sand?', options: ['Filtration', 'Magnetic Separation', 'Distillation', 'Evaporation'], correctIndex: 1, explanation: 'Iron filings stick to magnets.' }
      ]
    },
    {
      id: 'phy-6-force',
      grade: 6,
      subjectId: 'phy',
      subjectName: 'Physics',
      category: 'Force & Motion',
      title: 'Introduction to Force & Motion',
      subtitle: 'Understand push, pull, friction, gravity, and how forces change velocity.',
      xpReward: 95,
      estimatedTime: '15 mins',
      badge: '⚡ Force Cadet',
      engineType: 'physics',
      theorySummary: 'A force is a push or pull on an object resulting from its interaction with another object. Forces can change speed, direction, or shape of objects.',
      questions: [
        { id: 1, question: 'What force slows down sliding objects?', options: ['Gravity', 'Friction', 'Magnetism', 'Tension'], correctIndex: 1, explanation: 'Friction opposes relative motion between surfaces in contact.' }
      ]
    },
    {
      id: 'phy-6-light',
      grade: 6,
      subjectId: 'phy',
      subjectName: 'Physics',
      category: 'Light & Optics',
      title: 'Light, Shadows & Reflection Fundamentals',
      subtitle: 'Explore transparent materials, opaque shadows, and mirror reflections.',
      xpReward: 100,
      estimatedTime: '16 mins',
      badge: '🔦 Ray Explorer',
      engineType: 'physics',
      theorySummary: 'Light travels in straight lines. Opaque objects block light to form shadows. Mirrors reflect light obeying the law of reflection.',
      questions: [
        { id: 1, question: 'Which object allows all light to pass through?', options: ['Opaque', 'Transparent', 'Translucent', 'Reflective'], correctIndex: 1, explanation: 'Transparent materials let light pass completely.' }
      ]
    },
    {
      id: 'math-6-integers',
      grade: 6,
      subjectId: 'math',
      subjectName: 'Mathematics',
      category: 'Number System',
      title: 'Understanding Negative Numbers & Integers',
      subtitle: 'Visualize positive, negative integers and zero on the number line.',
      xpReward: 100,
      estimatedTime: '15 mins',
      badge: '🔢 Integer Pioneer',
      engineType: 'math',
      theorySummary: 'Integers include positive numbers, negative numbers, and zero. Numbers to the right on a number line are greater than numbers to the left.',
      questions: [
        { id: 1, question: 'What is (-5) + (+8)?', options: ['-3', '3', '13', '-13'], correctIndex: 1, explanation: '-5 + 8 = +3.' }
      ]
    },
    {
      id: 'math-6-ratios',
      grade: 6,
      subjectId: 'math',
      subjectName: 'Mathematics',
      category: 'Ratios & Proportions',
      title: 'Ratios & Proportions in Real Life',
      subtitle: 'Learn how to compare quantities, simplify ratios, and solve unitary method problems.',
      xpReward: 105,
      estimatedTime: '18 mins',
      badge: '📐 Ratio Analyst',
      engineType: 'math',
      theorySummary: 'A ratio compares two quantities by division. Equivalent ratios represent equal proportional relationships.',
      questions: [
        { id: 1, question: 'What is the simplified ratio of 10 to 25?', options: ['2:5', '5:2', '1:2', '3:5'], correctIndex: 0, explanation: 'Dividing both by 5 gives 2:5.' }
      ]
    },
    {
      id: 'cs-6-intro',
      grade: 6,
      subjectId: 'cs',
      subjectName: 'Computer Science',
      category: 'Computer Fundamentals',
      title: 'Fundamentals of Computers & Hardware',
      subtitle: 'Understand CPU, RAM, storage, input, and output peripheral devices.',
      xpReward: 90,
      estimatedTime: '12 mins',
      badge: '💻 Hardware Novice',
      engineType: 'cs',
      theorySummary: 'Computers process data into information using Input Devices (keyboard/mouse), Processing (CPU), Storage (SSD/RAM), and Output Devices (display/printer).',
      questions: [
        { id: 1, question: 'Which hardware component is considered the brain of the computer?', options: ['RAM', 'CPU', 'Hard Disk', 'Monitor'], correctIndex: 1, explanation: 'The Central Processing Unit (CPU) executes instructions.' }
      ]
    },
    {
      id: 'cs-6-algo',
      grade: 6,
      subjectId: 'cs',
      subjectName: 'Computer Science',
      category: 'Algorithmic Thinking',
      title: 'Step-by-Step Problem Solving & Logic',
      subtitle: 'Design logical sequences, instructions, and simple flowcharts.',
      xpReward: 95,
      estimatedTime: '15 mins',
      badge: '🧩 Logic Thinker',
      engineType: 'cs',
      theorySummary: 'An algorithm is an ordered sequence of clear steps designed to solve a specific problem efficiently.',
      questions: [
        { id: 1, question: 'What is an algorithm?', options: ['Hardware part', 'Step-by-step set of instructions', 'Programming language', 'Computer monitor'], correctIndex: 1, explanation: 'Algorithms are step-by-step computational workflows.' }
      ]
    },

    // ══════════════════════════════════════════════════════════════
    // CLASS 7 (Grades 7) — 5 Subjects x 2 Topics = 10 Topics
    // ══════════════════════════════════════════════════════════════
    {
      id: 'bio-7-nutrition',
      grade: 7,
      subjectId: 'bio',
      subjectName: 'Biology',
      category: 'Nutrition',
      title: 'Nutrition in Plants & Animals',
      subtitle: 'Understand autotrophic and heterotrophic nutrition, digestive systems and food chains.',
      xpReward: 120,
      estimatedTime: '20 mins',
      badge: '🍃 Nutrition Expert',
      engineType: 'biocell',
      theorySummary: 'Plants use Autotrophic Nutrition (photosynthesis). Animals use Heterotrophic Nutrition. The human digestive tract processes food in stomach and intestines.',
      questions: [
        { id: 1, question: 'What type of nutrition do plants use?', options: ['Heterotrophic', 'Parasitic', 'Autotrophic', 'Saprophytic'], correctIndex: 2, explanation: 'Plants manufacture food via autotrophic photosynthesis.' }
      ]
    },
    {
      id: 'bio-7-cell',
      grade: 7,
      subjectId: 'bio',
      subjectName: 'Biology',
      category: 'Cell Biology',
      title: 'Cell — The Unit of Life',
      subtitle: 'Explore cell theory, difference between plant and animal cells, and cell organelles.',
      xpReward: 130,
      estimatedTime: '22 mins',
      badge: '🔬 Cell Biologist',
      engineType: 'biocell',
      theorySummary: 'Cell Theory states all living things consist of cells. Plant cells feature cell walls and chloroplasts; animal cells lack cell walls.',
      questions: [
        { id: 1, question: 'Which organelle is in plant cells but NOT animal cells?', options: ['Mitochondria', 'Ribosome', 'Chloroplast', 'Nucleus'], correctIndex: 2, explanation: 'Chloroplasts carry out photosynthesis in plants.' }
      ]
    },
    {
      id: 'chem-7-acids',
      grade: 7,
      subjectId: 'chem',
      subjectName: 'Chemistry',
      category: 'Acids & Bases',
      title: 'Acids, Bases, Salts & pH Scale',
      subtitle: 'Understand indicators, neutralisation reactions and the pH scale.',
      xpReward: 130,
      estimatedTime: '20 mins',
      badge: '🧪 pH Analyst',
      engineType: 'chemistry',
      theorySummary: 'Acids produce H+ ions (pH < 7); Bases produce OH- ions (pH > 7). Neutralisation: Acid + Base -> Salt + Water.',
      questions: [
        { id: 1, question: 'What color does litmus turn in acidic solution?', options: ['Blue', 'Green', 'Yellow', 'Red'], correctIndex: 3, explanation: 'Acids turn blue litmus red.' }
      ]
    },
    {
      id: 'chem-7-physical-chemical',
      grade: 7,
      subjectId: 'chem',
      subjectName: 'Chemistry',
      category: 'Chemical Changes',
      title: 'Physical & Chemical Changes in Matter',
      subtitle: 'Identify reversible and irreversible changes, rusting, burning and indicators of reactions.',
      xpReward: 115,
      estimatedTime: '18 mins',
      badge: '⚗️ Reaction Analyst',
      engineType: 'chemistry',
      theorySummary: 'Physical changes are reversible without new substances. Chemical changes produce new substances with distinct chemical properties.',
      questions: [
        { id: 1, question: 'Which of the following is a CHEMICAL change?', options: ['Melting ice', 'Tearing paper', 'Burning wood', 'Dissolving salt'], correctIndex: 2, explanation: 'Burning wood produces ash, smoke, and CO₂.' }
      ]
    },
    {
      id: 'phy-7-heat',
      grade: 7,
      subjectId: 'phy',
      subjectName: 'Physics',
      category: 'Thermodynamics',
      title: 'Heat Transfer & Temperature Scales',
      subtitle: 'Conduction, Convection, Radiation, and Celsius vs Kelvin scales.',
      xpReward: 120,
      estimatedTime: '18 mins',
      badge: '🌡️ Thermal Master',
      engineType: 'physics',
      theorySummary: 'Heat transfers from higher to lower temperature via Conduction (solids), Convection (fluids), and Radiation (electromagnetic waves).',
      questions: [
        { id: 1, question: 'How does thermal energy travel from the Sun to Earth?', options: ['Conduction', 'Convection', 'Radiation', 'Insulation'], correctIndex: 2, explanation: 'Radiation travels through space vacuum without requiring a medium.' }
      ]
    },
    {
      id: 'phy-7-motion',
      grade: 7,
      subjectId: 'phy',
      subjectName: 'Physics',
      category: 'Kinematics',
      title: 'Speed, Distance & Time Graphs',
      subtitle: 'Calculate speed = distance/time and plot uniform motion graphs.',
      xpReward: 110,
      estimatedTime: '16 mins',
      badge: '⏱️ Kinematic Scout',
      engineType: 'physics',
      theorySummary: 'Speed is distance covered per unit time (m/s or km/h). Uniform motion graphs show straight diagonal lines on distance-time plots.',
      questions: [
        { id: 1, question: 'A car travels 120 km in 2 hours. What is its average speed?', options: ['60 km/h', '240 km/h', '50 km/h', '100 km/h'], correctIndex: 0, explanation: 'Speed = 120 / 2 = 60 km/h.' }
      ]
    },
    {
      id: 'math-7-algebra',
      grade: 7,
      subjectId: 'math',
      subjectName: 'Mathematics',
      category: 'Algebra',
      title: 'Algebraic Expressions & Variables',
      subtitle: 'Simplify algebraic terms, like/unlike variables, and solve 1-variable equations.',
      xpReward: 115,
      estimatedTime: '20 mins',
      badge: '🧮 Algebra Craft',
      engineType: 'math',
      theorySummary: 'Algebraic expressions combine constants and variables with operations (+, -, *, /). Like terms have identical variable powers.',
      questions: [
        { id: 1, question: 'Solve for x: 3x + 5 = 20', options: ['3', '5', '15', '4'], correctIndex: 1, explanation: '3x = 15 => x = 5.' }
      ]
    },
    {
      id: 'math-7-geometry',
      grade: 7,
      subjectId: 'math',
      subjectName: 'Mathematics',
      category: 'Geometry',
      title: 'Angles, Triangles & Parallel Lines',
      subtitle: 'Explore interior angle sum, complementary, supplementary, and alternate angles.',
      xpReward: 120,
      estimatedTime: '18 mins',
      badge: '📐 Angle Architect',
      engineType: 'math',
      theorySummary: 'Sum of interior angles of a triangle is always 180 degrees. Parallel lines cut by a transversal form equal alternate interior angles.',
      questions: [
        { id: 1, question: 'What is the sum of angles inside any triangle?', options: ['90°', '180°', '360°', '270°'], correctIndex: 1, explanation: 'Triangle interior angle sum theorem equals 180°.' }
      ]
    },
    {
      id: 'cs-7-binary',
      grade: 7,
      subjectId: 'cs',
      subjectName: 'Computer Science',
      category: 'Data Representation',
      title: 'Binary Number System & Data Encoding',
      subtitle: 'Convert between Decimal (base-10) and Binary (base-2) numbers.',
      xpReward: 110,
      estimatedTime: '15 mins',
      badge: '0️⃣ Binary Coder',
      engineType: 'cs',
      theorySummary: 'Computers represent all data using binary digits (0 and 1). Each position represents a power of 2.',
      questions: [
        { id: 1, question: 'What is decimal 5 in 4-bit binary?', options: ['0101', '0011', '1001', '0110'], correctIndex: 0, explanation: '4 + 1 = 0101 in binary.' }
      ]
    },
    {
      id: 'cs-7-scratch',
      grade: 7,
      subjectId: 'cs',
      subjectName: 'Computer Science',
      category: 'Visual Programming',
      title: 'Block Programming & Flowcharts',
      subtitle: 'Construct loops, event triggers, and decision blocks visually.',
      xpReward: 115,
      estimatedTime: '16 mins',
      badge: '🧱 Block Master',
      engineType: 'cs',
      theorySummary: 'Block programming uses drag-and-drop code blocks to teach control structures like loops, conditionals, and variables.',
      questions: [
        { id: 1, question: 'Which flow control block repeats code multiple times?', options: ['If-Then', 'Loop / Repeat', 'Set Variable', 'Stop'], correctIndex: 1, explanation: 'Loops execute a code block repeatedly.' }
      ]
    },

    // ══════════════════════════════════════════════════════════════
    // CLASS 8 (Grades 8) — 5 Subjects x 2 Topics = 10 Topics
    // ══════════════════════════════════════════════════════════════
    {
      id: 'bio-8-micro',
      grade: 8,
      subjectId: 'bio',
      subjectName: 'Biology',
      category: 'Microbiology',
      title: 'Microorganisms: Friend and Foe',
      subtitle: 'Bacteria, Fungi, Viruses, Protozoa, antibiotics, and food preservation.',
      xpReward: 130,
      estimatedTime: '20 mins',
      badge: '🧫 Microbe Hunter',
      engineType: 'biocell',
      theorySummary: 'Microorganisms include bacteria, fungi, protozoa, and viruses. Some cause diseases (pathogens) while others aid in fermentation, nitrogen fixation, and antibiotics.',
      questions: [
        { id: 1, question: 'Which microorganism converts milk into curd?', options: ['Penicillium', 'Lactobacillus', 'Rhizobium', 'Yeast'], correctIndex: 1, explanation: 'Lactobacillus bacteria ferment lactose into lactic acid.' }
      ]
    },
    {
      id: 'bio-8-reproduction',
      grade: 8,
      subjectId: 'bio',
      subjectName: 'Biology',
      category: 'Reproductive Biology',
      title: 'Reproduction & Growth in Animals',
      subtitle: 'Asexual vs Sexual reproduction, fertilization, and metamorphosis.',
      xpReward: 135,
      estimatedTime: '22 mins',
      badge: '🌱 Life Cycles',
      engineType: 'biocell',
      theorySummary: 'Reproduction produces offspring via Sexual (fusion of male & female gametes) or Asexual (budding, binary fission) mechanisms.',
      questions: [
        { id: 1, question: 'Amoeba reproduces through which process?', options: ['Budding', 'Binary Fission', 'Spore formation', 'Fertilization'], correctIndex: 1, explanation: 'Amoeba divides into two equal daughter cells via binary fission.' }
      ]
    },
    {
      id: 'chem-8-metals',
      grade: 8,
      subjectId: 'chem',
      subjectName: 'Chemistry',
      category: 'Materials & Reactions',
      title: 'Metals and Non-Metals: Properties & Reactions',
      subtitle: 'Malleability, ductility, conductivity, displacement reactions, and reactivity series.',
      xpReward: 130,
      estimatedTime: '20 mins',
      badge: '🔨 Metallurgist',
      engineType: 'chemistry',
      theorySummary: 'Metals are malleable, ductile, sonorous, and good conductors of heat/electricity. Non-metals are brittle and non-conductive (except graphite).',
      questions: [
        { id: 1, question: 'Which non-metal is a good conductor of electricity?', options: ['Sulfur', 'Graphite', 'Diamond', 'Phosphorus'], correctIndex: 1, explanation: 'Graphite (carbon allotrope) has free delocalized electrons.' }
      ]
    },
    {
      id: 'chem-8-combustion',
      grade: 8,
      subjectId: 'chem',
      subjectName: 'Chemistry',
      category: 'Chemical Kinetics',
      title: 'Combustion, Flame & Fuel Efficiency',
      subtitle: 'Ignition temperature, zones of candle flame, and calorific values of fuels.',
      xpReward: 125,
      estimatedTime: '18 mins',
      badge: '🔥 Flame Specialist',
      engineType: 'chemistry',
      theorySummary: 'Combustion requires fuel, oxygen, and reaching ignition temperature. Candle flames have non-luminous (outermost), luminous (middle), and dark (inner) zones.',
      questions: [
        { id: 1, question: 'Which zone of a candle flame is the HOTTEST?', options: ['Inner dark zone', 'Middle luminous zone', 'Outermost non-luminous zone', 'Base zone'], correctIndex: 2, explanation: 'The outermost zone undergoes complete combustion and is hottest.' }
      ]
    },
    {
      id: 'phy-8-pressure',
      grade: 8,
      subjectId: 'phy',
      subjectName: 'Physics',
      category: 'Fluid Mechanics',
      title: 'Force, Pressure & Atmospheric Thrust',
      subtitle: 'Pressure = Force / Area, hydraulic principles, and atmospheric pressure measurements.',
      xpReward: 130,
      estimatedTime: '20 mins',
      badge: '🎈 Pressure Engineer',
      engineType: 'physics',
      theorySummary: 'Pressure is force applied perpendicular to a surface area (P = F / A, measured in Pascals). Smaller surface areas exert higher pressure for the same force.',
      questions: [
        { id: 1, question: 'Why do sharp knives cut better than dull ones?', options: ['Larger surface area', 'Smaller surface area increases pressure', 'Less force required for gravity', 'Chemical reaction'], correctIndex: 1, explanation: 'Smaller edge area increases pressure exerted.' }
      ]
    },
    {
      id: 'phy-8-sound',
      grade: 8,
      subjectId: 'phy',
      subjectName: 'Physics',
      category: 'Acoustics',
      title: 'Sound Waves, Frequency & Pitch',
      subtitle: 'Vibrations, amplitude (loudness), frequency (Hertz/pitch), and speed of sound.',
      xpReward: 125,
      estimatedTime: '18 mins',
      badge: '🔊 Wave Acoustician',
      engineType: 'physics',
      theorySummary: 'Sound is produced by vibrating objects and travels as longitudinal mechanical waves. Pitch depends on frequency (Hz); loudness depends on amplitude.',
      questions: [
        { id: 1, question: 'What property of a sound wave determines its pitch?', options: ['Amplitude', 'Frequency', 'Speed', 'Timbre'], correctIndex: 1, explanation: 'Higher frequency produces a higher pitch sound.' }
      ]
    },
    {
      id: 'math-8-squares',
      grade: 8,
      subjectId: 'math',
      subjectName: 'Mathematics',
      category: 'Arithmetic & Algebra',
      title: 'Square Roots & Cube Roots',
      subtitle: 'Prime factorization, long division method for square roots, and perfect cubes.',
      xpReward: 130,
      estimatedTime: '20 mins',
      badge: '⬛ Root Calculator',
      engineType: 'math',
      theorySummary: 'Square root of N is a number x such that x² = N. Cube root of N satisfies x³ = N.',
      questions: [
        { id: 1, question: 'What is the square root of 144?', options: ['12', '14', '16', '11'], correctIndex: 0, explanation: '12 x 12 = 144.' }
      ]
    },
    {
      id: 'math-8-linear',
      grade: 8,
      subjectId: 'math',
      subjectName: 'Mathematics',
      category: 'Linear Algebra',
      title: 'Linear Equations in One Variable',
      subtitle: 'Transposition method, word problem formulations, and linear graph plotting.',
      xpReward: 125,
      estimatedTime: '18 mins',
      badge: '📈 Linear Solver',
      engineType: 'math',
      theorySummary: 'Linear equations have maximum variable degree 1. Solve by isolating variables on one side using inverse operations.',
      questions: [
        { id: 1, question: 'If 2x - 4 = 10, what is the value of x?', options: ['5', '7', '8', '6'], correctIndex: 1, explanation: '2x = 14 => x = 7.' }
      ]
    },
    {
      id: 'cs-8-networks',
      grade: 8,
      subjectId: 'cs',
      subjectName: 'Computer Science',
      category: 'Networking',
      title: 'Computer Networks & The Internet',
      subtitle: 'LAN, WAN, IP addresses, routers, DNS, and web protocols (HTTP/HTTPS).',
      xpReward: 120,
      estimatedTime: '18 mins',
      badge: '🌐 Net Specialist',
      engineType: 'cs',
      theorySummary: 'Networks connect computing devices to share resources. Data packets travel across networks using TCP/IP protocols and IP addressing.',
      questions: [
        { id: 1, question: 'What protocol secures encrypted communication on the web?', options: ['HTTP', 'HTTPS', 'FTP', 'SMTP'], correctIndex: 1, explanation: 'HTTPS uses TLS/SSL encryption for secure web traffic.' }
      ]
    },
    {
      id: 'cs-8-python',
      grade: 8,
      subjectId: 'cs',
      subjectName: 'Computer Science',
      category: 'Python Programming',
      title: 'Python Variables & Conditionals',
      subtitle: 'Data types (int, float, str, bool), print statements, and if-elif-else logic.',
      xpReward: 130,
      estimatedTime: '20 mins',
      badge: '🐍 Python Developer',
      engineType: 'cs',
      theorySummary: 'Python is a high-level interpreted programming language. Conditionals evaluate Boolean expressions to direct program control flow.',
      questions: [
        { id: 1, question: 'Which symbol is used for comments in Python?', options: ['//', '#', '/*', '--'], correctIndex: 1, explanation: 'The hash `#` symbol starts single-line comments in Python.' }
      ]
    },

    // ══════════════════════════════════════════════════════════════
    // CLASS 9 (Grades 9) — 5 Subjects x 2 Topics = 10 Topics
    // ══════════════════════════════════════════════════════════════
    {
      id: 'bio-9-cell',
      grade: 9,
      subjectId: 'bio',
      subjectName: 'Biology',
      category: 'Cell Biology',
      title: 'Cell Structure & Organelle Anatomy',
      subtitle: 'Explore 3D organelles, mitochondria power plants, and cell membrane transport.',
      xpReward: 150,
      estimatedTime: '20 mins',
      badge: '🧬 Cytologist',
      engineType: 'biocell',
      theorySummary: 'The cell is the basic structural and functional unit of life. Plant and animal cells contain membrane-bound organelles like nucleus, mitochondria, and endoplasmic reticulum.',
      questions: [
        { id: 1, question: 'Which organelle is known as the powerhouse of the cell?', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi Body'], correctIndex: 1, explanation: 'Mitochondria produce ATP through cellular respiration.' },
        { id: 2, question: 'What is the primary function of Ribosomes?', options: ['Protein Synthesis', 'Lipid Storage', 'DNA Replication', 'Waste Elimination'], correctIndex: 0, explanation: 'Ribosomes assemble amino acids into proteins.' }
      ]
    },
    {
      id: 'bio-9-tissues',
      grade: 9,
      subjectId: 'bio',
      subjectName: 'Biology',
      category: 'Histology',
      title: 'Plant & Animal Tissues Architecture',
      subtitle: 'Meristematic, Permanent plant tissues, and Epithelial, Connective, Muscular animal tissues.',
      xpReward: 145,
      estimatedTime: '20 mins',
      badge: '🔬 Histologist',
      engineType: 'biocell',
      theorySummary: 'Tissues are groups of cells with similar structure performing specific functions. Plants contain xylem/phloem vascular tissue; animals contain nervous and muscular tissues.',
      questions: [
        { id: 1, question: 'Which plant tissue transports water and minerals upwards?', options: ['Phloem', 'Xylem', 'Parenchyma', 'Collenchyma'], correctIndex: 1, explanation: 'Xylem conducts water and dissolved nutrients from roots to leaves.' }
      ]
    },
    {
      id: 'chem-9-atom',
      grade: 9,
      subjectId: 'chem',
      subjectName: 'Chemistry',
      category: 'Atomic Structure',
      title: 'Atomic Structure & Chemical Bonding',
      subtitle: 'Visualize Bohr models, electron orbital shells, and covalent bonding in 3D.',
      xpReward: 160,
      estimatedTime: '18 mins',
      badge: '🧪 Quantum Chemist',
      engineType: 'chemistry',
      theorySummary: 'Atoms consist of protons and neutrons in a central nucleus surrounded by orbiting electrons in discrete energy shells.',
      questions: [
        { id: 1, question: 'What particles are located in the atomic nucleus?', options: ['Electrons & Protons', 'Protons & Neutrons', 'Electrons only', 'Neutrons only'], correctIndex: 1, explanation: 'Protons and neutrons reside inside the nucleus.' }
      ]
    },
    {
      id: 'chem-9-mole',
      grade: 9,
      subjectId: 'chem',
      subjectName: 'Chemistry',
      category: 'Stoichiometry',
      title: 'Atoms, Molecules & Mole Concept',
      subtitle: 'Avogadro’s number (6.022 × 10²³), molar mass calculations, and chemical formulas.',
      xpReward: 155,
      estimatedTime: '22 mins',
      badge: '⚖️ Mole Master',
      engineType: 'chemistry',
      theorySummary: 'One mole of any substance contains Avogadro’s number (6.022 × 10²³) of elementary entities (atoms/molecules).',
      questions: [
        { id: 1, question: 'How many particles are present in 1 mole of carbon?', options: ['6.022 × 10²³', '3.011 × 10²³', '1.204 × 10²⁴', '6.022 × 10²²'], correctIndex: 0, explanation: 'One mole equals Avogadro’s constant: 6.022 × 10²³.' }
      ]
    },
    {
      id: 'phy-9-pendulum',
      grade: 9,
      subjectId: 'phy',
      subjectName: 'Physics',
      category: 'Oscillating Systems',
      title: 'Simple Harmonic Motion & Pendulum Oscillation',
      subtitle: 'Adjust length, mass, and gravity to observe real-time SHM sine waves.',
      xpReward: 140,
      estimatedTime: '15 mins',
      badge: '⚡ Harmonic Master',
      engineType: 'physics',
      theorySummary: 'A simple pendulum exhibits simple harmonic motion where restoring force is proportional to displacement.',
      questions: [
        { id: 1, question: 'What happens to a pendulum’s period when length is quadrupled?', options: ['Halved', 'Doubled', 'Stays Same', 'Quadrupled'], correctIndex: 1, explanation: 'Period T is proportional to square root of length L.' }
      ]
    },
    {
      id: 'phy-9-gravitation',
      grade: 9,
      subjectId: 'phy',
      subjectName: 'Physics',
      category: 'Gravitation',
      title: 'Universal Law of Gravitation & Free Fall',
      subtitle: 'F = G(m1*m2)/d², acceleration due to gravity (g = 9.8 m/s²), and weightlessness.',
      xpReward: 150,
      estimatedTime: '18 mins',
      badge: '🌌 Gravitational Physicist',
      engineType: 'physics',
      theorySummary: 'Newton’s law of universal gravitation states every mass attracts every other mass with force proportional to mass product and inversely proportional to squared distance.',
      questions: [
        { id: 1, question: 'What is the standard acceleration due to gravity near Earth surface?', options: ['9.8 m/s²', '1.6 m/s²', '9.8 cm/s²', '98 m/s²'], correctIndex: 0, explanation: 'Earth surface acceleration g ≈ 9.8 m/s².' }
      ]
    },
    {
      id: 'math-9-polynomials',
      grade: 9,
      subjectId: 'math',
      subjectName: 'Mathematics',
      category: 'Polynomials',
      title: 'Polynomials & Algebraic Identities',
      subtitle: 'Factor theorem, remainder theorem, quadratic expansion, and cubic factorization.',
      xpReward: 150,
      estimatedTime: '20 mins',
      badge: '📐 Polynomial Wizard',
      engineType: 'math',
      theorySummary: 'Polynomials are expressions with non-negative integer exponents. The factor theorem states (x - a) is a factor of P(x) if P(a) = 0.',
      questions: [
        { id: 1, question: 'Expand (a + b)²:', options: ['a² + b²', 'a² + 2ab + b²', 'a² - 2ab + b²', '2a + 2b'], correctIndex: 1, explanation: '(a+b)² = a² + 2ab + b².' }
      ]
    },
    {
      id: 'math-9-triangles',
      grade: 9,
      subjectId: 'math',
      subjectName: 'Mathematics',
      category: 'Geometry Theorems',
      title: 'Congruence & Triangles Theorems',
      subtitle: 'SAS, ASA, SSS, RHS congruence criteria and isosceles triangle properties.',
      xpReward: 145,
      estimatedTime: '18 mins',
      badge: '🔺 Proof Strategist',
      engineType: 'math',
      theorySummary: 'Triangles are congruent if their corresponding sides and angles are equal. SAS, ASA, SSS, and RHS prove congruence.',
      questions: [
        { id: 1, question: 'Which criteria proves congruence for right-angled triangles with equal hypotenuse and one side?', options: ['SAS', 'ASA', 'RHS', 'AAA'], correctIndex: 2, explanation: 'RHS (Right-angle, Hypotenuse, Side) criterion.' }
      ]
    },
    {
      id: 'cs-9-code',
      grade: 9,
      subjectId: 'cs',
      subjectName: 'Computer Science',
      category: 'Algorithms',
      title: 'Algorithmic Logic & Flowchart Execution',
      subtitle: 'Trace loops, conditional branching, and variable stacks interactively.',
      xpReward: 150,
      estimatedTime: '15 mins',
      badge: '💻 Logic Architect',
      engineType: 'cs',
      theorySummary: 'Algorithms are step-by-step instructions for solving problems using control flow constructs.',
      questions: [
        { id: 1, question: 'Which symbol represents a decision condition in flowcharts?', options: ['Rectangle', 'Diamond', 'Oval', 'Parallelogram'], correctIndex: 1, explanation: 'Diamonds represent decision conditional nodes.' }
      ]
    },
    {
      id: 'cs-9-data',
      grade: 9,
      subjectId: 'cs',
      subjectName: 'Computer Science',
      category: 'Data Structures',
      title: 'Arrays & Data Structures Basics',
      subtitle: 'Contiguous memory indexing, 1D/2D arrays, element iteration, and linear search.',
      xpReward: 140,
      estimatedTime: '16 mins',
      badge: '📦 Data Structure Engineer',
      engineType: 'cs',
      theorySummary: 'Arrays store collections of elements of the same type in contiguous memory locations indexed starting from 0.',
      questions: [
        { id: 1, question: 'In zero-indexed array arr = [10, 20, 30], what is arr[1]?', options: ['10', '20', '30', 'Undefined'], correctIndex: 1, explanation: 'arr[1] retrieves second element 20.' }
      ]
    },

    // ══════════════════════════════════════════════════════════════
    // CLASS 10 (Grades 10) — 5 Subjects x 2 Topics = 10 Topics
    // ══════════════════════════════════════════════════════════════
    {
      id: 'bio-10-life',
      grade: 10,
      subjectId: 'bio',
      subjectName: 'Biology',
      category: 'Human Physiology',
      title: 'Life Processes: Digestion & Respiration',
      subtitle: 'Human alimentary canal, enzyme actions, aerobic vs anaerobic respiration, and ATP.',
      xpReward: 165,
      estimatedTime: '22 mins',
      badge: '🫀 Physiology Specialist',
      engineType: 'biocell',
      theorySummary: 'Life processes maintain homeostasis. Digestion breaks down food macromolecules; respiration oxidizes glucose to generate ATP energy.',
      questions: [
        { id: 1, question: 'Where does aerobic respiration take place inside eukaryotic cells?', options: ['Cytoplasm', 'Mitochondria', 'Golgi apparatus', 'Ribosome'], correctIndex: 1, explanation: 'Mitochondria host Krebs cycle and oxidative phosphorylation.' }
      ]
    },
    {
      id: 'bio-10-heredity',
      grade: 10,
      subjectId: 'bio',
      subjectName: 'Biology',
      category: 'Genetics',
      title: 'Heredity & Genetics: Mendel’s Laws',
      subtitle: 'Monohybrid cross 3:1 ratio, dominant vs recessive alleles, Punnett squares.',
      xpReward: 170,
      estimatedTime: '24 mins',
      badge: '🧬 Geneticist',
      engineType: 'biocell',
      theorySummary: 'Gregor Mendel formulated laws of inheritance: Law of Segregation and Law of Independent Assortment using pea plant hybridization.',
      questions: [
        { id: 1, question: 'What is phenotypic ratio in Mendel monohybrid F2 generation?', options: ['1:1', '3:1', '9:3:3:1', '1:2:1'], correctIndex: 1, explanation: 'Monohybrid cross yields 3 dominant to 1 recessive phenotype.' }
      ]
    },
    {
      id: 'chem-10-carbon',
      grade: 10,
      subjectId: 'chem',
      subjectName: 'Chemistry',
      category: 'Organic Chemistry',
      title: 'Carbon & Its Compounds: Hydrocarbons',
      subtitle: 'Tetravalency, catenation, alkanes, alkenes, alkynes, and functional groups.',
      xpReward: 175,
      estimatedTime: '22 mins',
      badge: '💎 Organic Chemist',
      engineType: 'chemistry',
      theorySummary: 'Carbon forms diverse covalent compounds due to tetravalency and catenation (self-linking ability). Hydrocarbons contain carbon and hydrogen.',
      questions: [
        { id: 1, question: 'What type of carbon bond is present in Alkenes?', options: ['Single C-C', 'Double C=C', 'Triple C≡C', 'Ionic'], correctIndex: 1, explanation: 'Alkenes are unsaturated hydrocarbons with at least one double C=C bond.' }
      ]
    },
    {
      id: 'chem-10-periodic',
      grade: 10,
      subjectId: 'chem',
      subjectName: 'Chemistry',
      category: 'Periodic Table',
      title: 'Periodic Classification of Elements',
      subtitle: 'Modern periodic law, atomic radius trends, electronegativity, and metallic character.',
      xpReward: 165,
      estimatedTime: '20 mins',
      badge: '📊 Periodic Master',
      engineType: 'chemistry',
      theorySummary: 'Modern Periodic Law states properties of elements are periodic functions of their atomic numbers (Z). Groups share valence electron configurations.',
      questions: [
        { id: 1, question: 'How does atomic radius change across a period from left to right?', options: ['Increases', 'Decreases', 'Remains same', 'Doubles'], correctIndex: 1, explanation: 'Increased nuclear charge pulls electrons closer, decreasing atomic radius.' }
      ]
    },
    {
      id: 'phy-10-electricity',
      grade: 10,
      subjectId: 'phy',
      subjectName: 'Physics',
      category: 'Electromagnetism',
      title: 'Electric Current, Resistance & Ohm’s Law',
      subtitle: 'V = I * R, series and parallel resistor circuits, and electrical energy P = VI.',
      xpReward: 170,
      estimatedTime: '20 mins',
      badge: '⚡ Circuit Designer',
      engineType: 'physics',
      theorySummary: 'Ohm’s law states current I flowing through conductor is directly proportional to potential difference V across ends (V = IR).',
      questions: [
        { id: 1, question: 'What is total resistance of two 4-ohm resistors connected in PARALLEL?', options: ['8 ohms', '2 ohms', '4 ohms', '16 ohms'], correctIndex: 1, explanation: '1/R = 1/4 + 1/4 = 1/2 => R = 2 ohms.' }
      ]
    },
    {
      id: 'phy-10-optics',
      grade: 10,
      subjectId: 'phy',
      subjectName: 'Physics',
      category: 'Optics',
      title: 'Light Reflection & Refraction Lenses',
      subtitle: 'Convex/concave mirrors, lens formula 1/f = 1/v - 1/u, magnification, and human eye.',
      xpReward: 160,
      estimatedTime: '22 mins',
      badge: '🔍 Optical Physicist',
      engineType: 'physics',
      theorySummary: 'Refraction occurs when light bends passing between optically different media due to speed changes. Lenses form real or virtual images.',
      questions: [
        { id: 1, question: 'Which lens type converges light rays to a focal point?', options: ['Convex Lens', 'Concave Lens', 'Flat Glass', 'Prism'], correctIndex: 0, explanation: 'Convex lenses are converging optical elements.' }
      ]
    },
    {
      id: 'math-10-trig',
      grade: 10,
      subjectId: 'math',
      subjectName: 'Mathematics',
      category: 'Trigonometry',
      title: 'Trigonometric Functions & Wave Plotter',
      subtitle: 'Manipulate amplitude, frequency, and phase shift in real-time unit circle waves.',
      xpReward: 180,
      estimatedTime: '22 mins',
      badge: '📐 Sine Wave Master',
      engineType: 'math',
      theorySummary: 'Sine and cosine functions describe periodic oscillations and unit circle geometric ratios.',
      questions: [
        { id: 1, question: 'What is the period of standard sin(x)?', options: ['π', '2π', 'π/2', '4π'], correctIndex: 1, explanation: 'Standard sine function repeats every 2π radians.' }
      ]
    },
    {
      id: 'math-10-quadratic',
      grade: 10,
      subjectId: 'math',
      subjectName: 'Mathematics',
      category: 'Quadratic Equations',
      title: 'Quadratic Equations & Parabolic Roots',
      subtitle: 'ax² + bx + c = 0, discriminant D = b² - 4ac, and vertex parabolic curve graphs.',
      xpReward: 175,
      estimatedTime: '20 mins',
      badge: '📈 Root Analyst',
      engineType: 'math',
      theorySummary: 'Quadratic roots are given by x = (-b ± √(b² - 4ac)) / (2a). Discriminant D determines real vs complex roots.',
      questions: [
        { id: 1, question: 'If discriminant D > 0, what are the roots?', options: ['Two distinct real roots', 'Two equal real roots', 'Complex imaginary roots', 'No roots'], correctIndex: 0, explanation: 'D > 0 produces two unique real solutions.' }
      ]
    },
    {
      id: 'cs-10-oop',
      grade: 10,
      subjectId: 'cs',
      subjectName: 'Computer Science',
      category: 'Object Oriented Programming',
      title: 'Object-Oriented Programming Concepts',
      subtitle: 'Classes, Objects, Encapsulation, Inheritance, and Polymorphism.',
      xpReward: 170,
      estimatedTime: '20 mins',
      badge: '🏗️ OOP Architect',
      engineType: 'cs',
      theorySummary: 'OOP structures software design around objects containing attributes (data) and methods (behavior) using encapsulation and inheritance.',
      questions: [
        { id: 1, question: 'Which OOP pillar hides internal object details and exposes public methods?', options: ['Inheritance', 'Encapsulation', 'Polymorphism', 'Abstraction'], correctIndex: 1, explanation: 'Encapsulation wraps state and restricts direct access.' }
      ]
    },
    {
      id: 'cs-10-dbms',
      grade: 10,
      subjectId: 'cs',
      subjectName: 'Computer Science',
      category: 'Database Systems',
      title: 'Relational Database Systems & SQL Basics',
      subtitle: 'Tables, Primary keys, Foreign keys, SELECT queries, WHERE filters, and JOINs.',
      xpReward: 165,
      estimatedTime: '18 mins',
      badge: '🗄️ SQL Master',
      engineType: 'cs',
      theorySummary: 'RDBMS organizes data into tables linked by primary and foreign key constraints, queried via Structured Query Language (SQL).',
      questions: [
        { id: 1, question: 'Which SQL clause filters records based on specific conditions?', options: ['ORDER BY', 'WHERE', 'GROUP BY', 'SELECT'], correctIndex: 1, explanation: 'WHERE filters rows matching specified predicates.' }
      ]
    },

    // ══════════════════════════════════════════════════════════════
    // CLASS 11 (Grades 11) — 5 Subjects x 2 Topics = 10 Topics
    // ══════════════════════════════════════════════════════════════
    {
      id: 'bio-11-biomolecules',
      grade: 11,
      subjectId: 'bio',
      subjectName: 'Biology',
      category: 'Biochemistry',
      title: 'Biomolecules: Proteins, Lipids & Nucleic Acids',
      subtitle: 'Amino acid peptide bonds, polysaccharide structures, DNA double helix, and enzyme kinetics.',
      xpReward: 190,
      estimatedTime: '25 mins',
      badge: '🧬 Molecular Biologist',
      engineType: 'biocell',
      theorySummary: 'Biomolecules are organic molecules in organisms. Proteins are amino acid polymers; Nucleic acids (DNA/RNA) store genetic code.',
      questions: [
        { id: 1, question: 'What bond links amino acids together in protein chains?', options: ['Glycosidic Bond', 'Peptide Bond', 'Phosphodiester Bond', 'Hydrogen Bond'], correctIndex: 1, explanation: 'Peptide bonds link carboxyl and amino groups.' }
      ]
    },
    {
      id: 'bio-11-plantphys',
      grade: 11,
      subjectId: 'bio',
      subjectName: 'Biology',
      category: 'Plant Physiology',
      title: 'Plant Physiology & Calvin Cycle',
      subtitle: 'Light-dependent reactions, ATP/NADPH synthesis, C3 vs C4 photosynthetic pathways.',
      xpReward: 185,
      estimatedTime: '24 mins',
      badge: '🌴 Photosynthesis Master',
      engineType: 'biocell',
      theorySummary: 'Photosynthesis includes light reactions in thylakoids generating ATP/NADPH and Calvin cycle in stroma fixing CO₂ into glucose.',
      questions: [
        { id: 1, question: 'Which enzyme fixes carbon dioxide in Calvin cycle?', options: ['RuBisCO', 'ATP Synthase', 'Pepsin', 'Amylase'], correctIndex: 0, explanation: 'RuBisCO catalyzes primary carbon fixation in C3 plants.' }
      ]
    },
    {
      id: 'chem-11-quantum',
      grade: 11,
      subjectId: 'chem',
      subjectName: 'Chemistry',
      category: 'Physical Chemistry',
      title: 'Quantum Mechanical Model of Atom',
      subtitle: 'Schrödinger equation, s, p, d, f orbitals, Pauli exclusion, and Hund’s rule.',
      xpReward: 200,
      estimatedTime: '25 mins',
      badge: '⚛️ Quantum Physicist',
      engineType: 'chemistry',
      theorySummary: 'Quantum model describes electron behavior as wavefunctions (orbitals) characterized by 4 quantum numbers (n, l, ml, ms).',
      questions: [
        { id: 1, question: 'How many maximum electrons can occupy an s-orbital?', options: ['2', '6', '10', '14'], correctIndex: 0, explanation: 'An s-orbital holds up to 2 electrons with opposite spins.' }
      ]
    },
    {
      id: 'chem-11-thermo',
      grade: 11,
      subjectId: 'chem',
      subjectName: 'Chemistry',
      category: 'Thermodynamics',
      title: 'Chemical Thermodynamics & Enthalpy',
      subtitle: 'First and Second Laws of Thermodynamics, Hess Law, Enthalpy (ΔH), and Gibbs Free Energy (ΔG).',
      xpReward: 195,
      estimatedTime: '24 mins',
      badge: '🔥 Enthalpy Expert',
      engineType: 'chemistry',
      theorySummary: 'Spontaneity of a chemical process is governed by Gibbs free energy change ΔG = ΔH - TΔS. Negative ΔG signifies spontaneous reaction.',
      questions: [
        { id: 1, question: 'A chemical reaction is spontaneous when Gibbs Free Energy ΔG is:', options: ['Positive (> 0)', 'Negative (< 0)', 'Zero', 'Infinite'], correctIndex: 1, explanation: 'Negative ΔG indicates exergonic spontaneous processes.' }
      ]
    },
    {
      id: 'phy-11-vectors',
      grade: 11,
      subjectId: 'phy',
      subjectName: 'Physics',
      category: 'Classical Mechanics',
      title: 'Vector Mechanics & Projectile Motion',
      subtitle: 'Vector dot/cross products, trajectory equations, range, and maximum height.',
      xpReward: 190,
      estimatedTime: '22 mins',
      badge: '🎯 Ballistic Physicist',
      engineType: 'physics',
      theorySummary: 'Projectiles follow parabolic trajectories governed by independent horizontal uniform velocity and vertical gravitational acceleration.',
      questions: [
        { id: 1, question: 'At what launch angle is projectile range MAXIMIZED in vacuum?', options: ['30°', '45°', '60°', '90°'], correctIndex: 1, explanation: 'Range R = (v² sin 2θ)/g is maximum at sin(90°) => θ = 45°.' }
      ]
    },
    {
      id: 'phy-11-waves',
      grade: 11,
      subjectId: 'phy',
      subjectName: 'Physics',
      category: 'Wave Dynamics',
      title: 'Wave Dynamics & Interference',
      subtitle: 'Superposition principle, standing waves, Doppler effect, and resonance.',
      xpReward: 185,
      estimatedTime: '22 mins',
      badge: '🌊 Wave Harmonicist',
      engineType: 'physics',
      theorySummary: 'Constructive and destructive interference occur when co-propagating coherent waves overlap, obeying the superposition principle.',
      questions: [
        { id: 1, question: 'What phenomenon causes frequency shift when sound source moves towards observer?', options: ['Refraction', 'Doppler Effect', 'Diffraction', 'Polarization'], correctIndex: 1, explanation: 'Doppler effect shifts perceived frequency due to relative motion.' }
      ]
    },
    {
      id: 'math-11-calculus',
      grade: 11,
      subjectId: 'math',
      subjectName: 'Mathematics',
      category: 'Differential Calculus',
      title: 'Limits & Derivatives Foundations',
      subtitle: 'First principles derivative definition, product/quotient rules, and chain rule.',
      xpReward: 200,
      estimatedTime: '25 mins',
      badge: '∫ Derivative Analyst',
      engineType: 'math',
      theorySummary: 'Derivative dy/dx measures instantaneous rate of change of function y with respect to x. d/dx(x^n) = n*x^(n-1).',
      questions: [
        { id: 1, question: 'What is the derivative of f(x) = x³?', options: ['3x²', 'x²', '3x', '3x³'], correctIndex: 0, explanation: 'Power rule: d/dx(x³) = 3x².' }
      ]
    },
    {
      id: 'math-11-complex',
      grade: 11,
      subjectId: 'math',
      subjectName: 'Mathematics',
      category: 'Complex Numbers',
      title: 'Complex Numbers & Argand Plane',
      subtitle: 'i² = -1, polar form r(cos θ + i sin θ), Euler formula, and De Moivre theorem.',
      xpReward: 190,
      estimatedTime: '22 mins',
      badge: '🌀 Argand Navigator',
      engineType: 'math',
      theorySummary: 'Complex numbers z = a + bi combine real part a and imaginary part b (where i² = -1), plotted on 2D Argand plane.',
      questions: [
        { id: 1, question: 'What is the value of i⁴ (where i = √-1)?', options: ['-1', '1', 'i', '-i'], correctIndex: 1, explanation: 'i² = -1 => i⁴ = (-1)² = 1.' }
      ]
    },
    {
      id: 'cs-11-datastructures',
      grade: 11,
      subjectId: 'cs',
      subjectName: 'Computer Science',
      category: 'Advanced Data Structures',
      title: 'Stack, Queue & Linked List Architecture',
      subtitle: 'LIFO stack push/pop, FIFO queue enqueue/dequeue, and node pointer references.',
      xpReward: 195,
      estimatedTime: '24 mins',
      badge: '🥞 Stack Engineer',
      engineType: 'cs',
      theorySummary: 'Stacks follow Last-In-First-Out (LIFO); Queues follow First-In-First-Out (FIFO); Linked lists connect nodes dynamically using pointers.',
      questions: [
        { id: 1, question: 'Which data structure operates on Last-In-First-Out (LIFO) principle?', options: ['Queue', 'Stack', 'Array', 'Tree'], correctIndex: 1, explanation: 'Stack pushes and pops elements in LIFO order.' }
      ]
    },
    {
      id: 'cs-11-sorting',
      grade: 11,
      subjectId: 'cs',
      subjectName: 'Computer Science',
      category: 'Algorithms',
      title: 'Sorting Algorithms & Time Complexity',
      subtitle: 'Bubble Sort, Merge Sort, Quick Sort, and Big-O notation O(N log N).',
      xpReward: 190,
      estimatedTime: '22 mins',
      badge: '⚡ Algo Optimizer',
      engineType: 'cs',
      theorySummary: 'Merge sort uses divide-and-conquer achieving O(N log N) worst-case time complexity, outperforming O(N²) quadratic sorts.',
      questions: [
        { id: 1, question: 'What is the average time complexity of Merge Sort?', options: ['O(N²)', 'O(N log N)', 'O(N)', 'O(1)'], correctIndex: 1, explanation: 'Merge sort consistently runs in O(N log N) time.' }
      ]
    },

    // ══════════════════════════════════════════════════════════════
    // CLASS 12 (Grades 12) — 5 Subjects x 2 Topics = 10 Topics
    // ══════════════════════════════════════════════════════════════
    {
      id: 'bio-12-genetics',
      grade: 12,
      subjectId: 'bio',
      subjectName: 'Biology',
      category: 'Molecular Biology',
      title: 'Molecular Basis of Inheritance (DNA & RNA)',
      subtitle: 'DNA double helix replication, transcription, genetic code, and translation synthesis.',
      xpReward: 220,
      estimatedTime: '26 mins',
      badge: '🧬 Genomic Pioneer',
      engineType: 'biocell',
      theorySummary: 'Central Dogma of molecular biology: DNA replicates, transcribes to mRNA, and translates into functional cellular proteins.',
      questions: [
        { id: 1, question: 'Which nitrogenous base is present in RNA instead of Thymine?', options: ['Adenine', 'Guanine', 'Uracil', 'Cytosine'], correctIndex: 2, explanation: 'RNA uses Uracil (U) in place of Thymine (T).' }
      ]
    },
    {
      id: 'bio-12-biotech',
      grade: 12,
      subjectId: 'bio',
      subjectName: 'Biology',
      category: 'Biotechnology',
      title: 'Biotechnology Principles & Recombinant DNA',
      subtitle: 'Restriction enzymes, plasmid vectors, PCR amplification, and gel electrophoresis.',
      xpReward: 210,
      estimatedTime: '25 mins',
      badge: '💉 Bioengineer',
      engineType: 'biocell',
      theorySummary: 'Recombinant DNA technology uses restriction endonucleases to cut target DNA and ligases to insert genes into vector plasmids.',
      questions: [
        { id: 1, question: 'What enzymes act as chemical molecular scissors to cut DNA at specific sites?', options: ['DNA Ligase', 'Restriction Endonucleases', 'Polymerase', 'Helicase'], correctIndex: 1, explanation: 'Restriction endonucleases cut specific recognition sequences.' }
      ]
    },
    {
      id: 'chem-12-electro',
      grade: 12,
      subjectId: 'chem',
      subjectName: 'Chemistry',
      category: 'Electrochemistry',
      title: 'Electrochemistry & Nernst Equation',
      subtitle: 'Galvanic cells, standard reduction potentials, Nernst equation E = E° - (RT/nF)lnQ.',
      xpReward: 215,
      estimatedTime: '25 mins',
      badge: '🔋 Electrochemical Master',
      engineType: 'chemistry',
      theorySummary: 'Galvanic cells convert chemical energy of redox reactions into electrical voltage. Cell potential depends on ion concentration via Nernst equation.',
      questions: [
        { id: 1, question: 'In a Galvanic cell, oxidation occurs at which electrode?', options: ['Cathode', 'Anode', 'Salt Bridge', 'Electrolyte'], correctIndex: 1, explanation: 'Oxidation ALWAYS occurs at the Anode (AN OX).' }
      ]
    },
    {
      id: 'chem-12-kinetics',
      grade: 12,
      subjectId: 'chem',
      subjectName: 'Chemistry',
      category: 'Chemical Kinetics',
      title: 'Chemical Kinetics & Reaction Rates',
      subtitle: 'Zero and First order reaction rate laws, half-life (t1/2), and Arrhenius activation energy.',
      xpReward: 210,
      estimatedTime: '24 mins',
      badge: '⏱️ Reaction Kineticist',
      engineType: 'chemistry',
      theorySummary: 'First-order reaction rate is proportional to single reactant concentration. Half-life t1/2 = 0.693 / k is independent of initial concentration.',
      questions: [
        { id: 1, question: 'For a FIRST-ORDER reaction, the half-life t1/2 is:', options: ['Proportional to initial concentration', 'Independent of initial concentration', 'Inversely proportional to temperature', 'Zero'], correctIndex: 1, explanation: 'First-order half life t1/2 = 0.693 / k is constant.' }
      ]
    },
    {
      id: 'phy-12-electromag',
      grade: 12,
      subjectId: 'phy',
      subjectName: 'Physics',
      category: 'Electromagnetism',
      title: 'Electromagnetic Induction & AC Circuits',
      subtitle: 'Faraday’s law, Lenz’s law, transformers, RLC series resonance, and AC power factor.',
      xpReward: 220,
      estimatedTime: '25 mins',
      badge: '🧲 Electromagnet Specialist',
      engineType: 'physics',
      theorySummary: 'Faraday’s Law states changing magnetic flux induces electromotive force (EMF). Lenz’s law specifies induced current opposes flux change.',
      questions: [
        { id: 1, question: 'Lenz’s law of electromagnetic induction is a direct consequence of which conservation law?', options: ['Charge Conservation', 'Energy Conservation', 'Momentum Conservation', 'Mass Conservation'], correctIndex: 1, explanation: 'Lenz’s law upholds the Conservation of Energy.' }
      ]
    },
    {
      id: 'phy-12-semiconductors',
      grade: 12,
      subjectId: 'phy',
      subjectName: 'Physics',
      category: 'Solid State Electronics',
      title: 'Semiconductor Electronics & p-n Junctions',
      subtitle: 'Intrinsic vs Extrinsic (n-type, p-type) semiconductors, diode rectifiers, and transistors.',
      xpReward: 210,
      estimatedTime: '24 mins',
      badge: '🔌 Semiconductor Physicist',
      engineType: 'physics',
      theorySummary: 'Doping silicon with Group 15 elements yields n-type semiconductors (majority electrons); Group 13 yields p-type (majority holes).',
      questions: [
        { id: 1, question: 'Doping pure silicon with Phosphorus (Group 15) produces what type of semiconductor?', options: ['n-type', 'p-type', 'Intrinsic', 'Superconductor'], correctIndex: 0, explanation: 'Pentavalent doping adds extra free electrons, creating n-type semiconductor.' }
      ]
    },
    {
      id: 'math-12-integration',
      grade: 12,
      subjectId: 'math',
      subjectName: 'Mathematics',
      category: 'Integral Calculus',
      title: 'Definite & Indefinite Integration',
      subtitle: 'Integration by parts, partial fractions, substitution method, and area under curve.',
      xpReward: 230,
      estimatedTime: '28 mins',
      badge: '∫ Integral Master',
      engineType: 'math',
      theorySummary: 'Integration is the inverse operation of differentiation. Definite integrals compute bounded surface area under mathematical curves.',
      questions: [
        { id: 1, question: 'What is the indefinite integral ∫ x² dx?', options: ['(x³/3) + C', '2x + C', 'x³ + C', '(x²/2) + C'], correctIndex: 0, explanation: '∫ x^n dx = (x^(n+1))/(n+1) + C => x³/3 + C.' }
      ]
    },
    {
      id: 'math-12-matrices',
      grade: 12,
      subjectId: 'math',
      subjectName: 'Mathematics',
      category: 'Linear Algebra 3D',
      title: 'Matrices & Vector Algebra 3D',
      subtitle: 'Matrix inversion A⁻¹ = adj(A)/|A|, determinants, vector cross product, and 3D line planes.',
      xpReward: 220,
      estimatedTime: '25 mins',
      badge: '🧊 3D Vector Specialist',
      engineType: 'math',
      theorySummary: 'Matrix inverse exists if determinant |A| ≠ 0. Vector cross product A × B yields perpendicular vector with magnitude |A||B| sin θ.',
      questions: [
        { id: 1, question: 'If determinant |A| = 0, what is matrix A called?', options: ['Invertible', 'Singular', 'Identity', 'Diagonal'], correctIndex: 1, explanation: 'A matrix with zero determinant is singular (non-invertible).' }
      ]
    },
    {
      id: 'cs-12-ai',
      grade: 12,
      subjectId: 'cs',
      subjectName: 'Computer Science',
      category: 'Artificial Intelligence',
      title: 'Artificial Intelligence & Neural Network Principles',
      subtitle: 'Perceptrons, activation functions (ReLU, Sigmoid), gradient descent, and deep learning.',
      xpReward: 240,
      estimatedTime: '28 mins',
      badge: '🤖 AI Architect',
      engineType: 'cs',
      theorySummary: 'Artificial Neural Networks mimic biological neurons using weighted inputs, activation functions, and backpropagation optimization.',
      questions: [
        { id: 1, question: 'Which algorithm optimizes neural network weights by calculating loss gradients backwards?', options: ['Forward Pass', 'Backpropagation', 'Linear Search', 'K-Means'], correctIndex: 1, explanation: 'Backpropagation computes loss gradients to adjust synaptic weights.' }
      ]
    },
    {
      id: 'cs-12-cyber',
      grade: 12,
      subjectId: 'cs',
      subjectName: 'Computer Science',
      category: 'Cybersecurity',
      title: 'Cybersecurity Protocols & Cryptography',
      subtitle: 'Symmetric vs Asymmetric RSA encryption, hashing (SHA-256), public key PKI, and firewalls.',
      xpReward: 230,
      estimatedTime: '25 mins',
      badge: '🛡️ Crypto Specialist',
      engineType: 'cs',
      theorySummary: 'Asymmetric cryptography uses paired public (encryption) and private (decryption) keys to secure digital communications.',
      questions: [
        { id: 1, question: 'In RSA public-key cryptography, which key is kept secret by the owner?', options: ['Public Key', 'Private Key', 'Hash Key', 'Shared Key'], correctIndex: 1, explanation: 'Private key must remain strictly secret to decrypt messages.' }
      ]
    }
  ];
}
