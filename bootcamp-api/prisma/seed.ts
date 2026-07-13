import 'dotenv/config';
import { PrismaClient, SessionType } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const pool = new Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const SESSION_TYPES: SessionType[] = ['online', 'in_person', 'hybrid', 'online', 'in_person', 'hybrid'];

function totalSeats(s: SessionType) {
  return s === 'online' ? 20 : s === 'in_person' ? 15 : 25;
}
function location(s: SessionType) {
  return s === 'online' ? null : s === 'in_person' ? 'Downtown Training Center' : 'Campus Lab B';
}
function priceModifier(s: SessionType) {
  if (s === 'online') return 5;
  if (s === 'hybrid') return 15;
  return 30;
}

const NON_FEATURED_COMBOS = [
  [1, 1],
  [1, 2],
  [2, 1],
  [3, 3],
];
const FEATURED_COMBOS = [
  [1, 1],
  [1, 2],
  [2, 1],
  [2, 3],
  [3, 2],
  [4, 3],
];

async function main() {
  await prisma.enrollment.deleteMany();
  await prisma.review.deleteMany();
  await prisma.courseSchedule.deleteMany();
  await prisma.course.deleteMany();
  await prisma.topic.deleteMany();
  await prisma.category.deleteMany();
  await prisma.instructor.deleteMany();
  await prisma.user.deleteMany();

  await prisma.category.createMany({
    data: [
      { id: 1, name: 'Development', icon: 'development' },
      { id: 2, name: 'Data Science', icon: 'data-science' },
      { id: 3, name: 'Design', icon: 'design' },
      { id: 4, name: 'Business', icon: 'business' },
      { id: 5, name: 'Marketing', icon: 'marketing' },
    ],
  });

  await prisma.topic.createMany({
    data: [
      { id: 1,  name: 'React',           categoryId: 1 },
      { id: 2,  name: 'TypeScript',      categoryId: 1 },
      { id: 3,  name: 'JavaScript',      categoryId: 1 },
      { id: 4,  name: 'Node.js',         categoryId: 1 },
      { id: 5,  name: 'Python',          categoryId: 2 },
      { id: 6,  name: 'Machine Learning',categoryId: 2 },
      { id: 7,  name: 'Analytics',       categoryId: 2 },
      { id: 8,  name: 'UX/UI',           categoryId: 3 },
      { id: 9,  name: 'Figma',           categoryId: 3 },
      { id: 10, name: 'SEO',             categoryId: 5 },
    ],
  });

  await prisma.instructor.createMany({
    data: [
      { id: 1, name: 'Dr. Sarah Chen', avatar: 'https://i.pravatar.cc/150?img=1' },
      { id: 2, name: 'Marcus Johnson', avatar: 'https://i.pravatar.cc/150?img=2' },
      { id: 3, name: 'Elena Rodriguez', avatar: 'https://i.pravatar.cc/150?img=3' },
      { id: 4, name: 'Prof. James Wright', avatar: 'https://i.pravatar.cc/150?img=4' },
      { id: 5, name: 'Aisha Patel', avatar: 'https://i.pravatar.cc/150?img=5' },
      { id: 6, name: 'David Kim', avatar: 'https://i.pravatar.cc/150?img=6' },
      { id: 7, name: 'Fatima Al-Hassan', avatar: 'https://i.pravatar.cc/150?img=7' },
      { id: 8, name: 'Carlos Mendez', avatar: 'https://i.pravatar.cc/150?img=8' },
      { id: 9, name: 'Nina Kowalski', avatar: 'https://i.pravatar.cc/150?img=9' },
      { id: 10, name: 'Omar Siddiqui', avatar: 'https://i.pravatar.cc/150?img=10' },
      { id: 11, name: 'Laura Bianchi', avatar: 'https://i.pravatar.cc/150?img=11' },
      { id: 12, name: 'Kenji Tanaka', avatar: 'https://i.pravatar.cc/150?img=12' },
    ],
  });

  const prices = [49.99, 79.99, 99.99, 129.99, 149.99, 199.99];
  const weeks = [6, 8, 10, 12, 8, 16];
  const hours = [30, 40, 50, 60, 40, 80];
  // indices 2 (React Mastery), 8 (Deep Learning), 14 (iOS with Swift)
  const featuredIndices = new Set([2, 8, 14]);

  const courseData = [
    // Web Development (cat 1, topics 1-6)
    { title: 'Complete HTML & CSS Bootcamp', description: 'Master the foundations of web design with hands-on HTML5 and CSS3 projects. Build responsive, accessible websites from scratch using modern best practices.' },
    { title: 'JavaScript: From Zero to Hero', description: 'Go from beginner to confident JavaScript developer through interactive exercises and real projects. Learn ES6+, async programming, and the DOM API.' },
    { title: 'React Mastery Course', description: 'Build powerful single-page applications with React 18 and its modern hooks-based architecture. Covers state management, routing, and performance optimization.' },
    { title: 'Node.js Backend Development', description: 'Create scalable server-side applications using Node.js and Express. Learn REST API design, authentication, database integration, and deployment.' },
    { title: 'TypeScript for React Developers', description: 'Add static typing to your React projects and eliminate entire categories of runtime errors. Covers interfaces, generics, and advanced TypeScript patterns.' },
    { title: 'Full-Stack Web Development', description: 'Combine frontend and backend skills to build complete web applications end-to-end. Deploy production-ready apps with CI/CD pipelines and cloud hosting.' },
    // Data Science (cat 2, topics 7-12)
    { title: 'Python for Data Science Fundamentals', description: 'Learn Python specifically for data analysis using NumPy, Pandas, and Matplotlib. Process and visualize real-world datasets to extract actionable insights.' },
    { title: 'Machine Learning with Scikit-Learn', description: 'Implement supervised and unsupervised learning algorithms using Python\'s leading ML library. Build predictive models and evaluate their performance rigorously.' },
    { title: 'Deep Learning with TensorFlow & Keras', description: 'Design and train neural networks for image recognition, NLP, and time-series tasks. Covers CNNs, RNNs, transformers, and model deployment.' },
    { title: 'Data Visualization with Power BI', description: 'Create compelling dashboards and reports that turn raw data into business insights. Master DAX, Power Query, and best practices in visual communication.' },
    { title: 'SQL & Database Design Mastery', description: 'Write complex queries, design normalized schemas, and optimize database performance. Covers PostgreSQL, indexing strategies, and query execution plans.' },
    { title: 'Big Data Engineering with Spark', description: 'Process petabyte-scale datasets using Apache Spark and Hadoop ecosystem tools. Learn streaming, batch processing, and Spark SQL for enterprise data pipelines.' },
    // Mobile Development (cat 3, topics 13-18)
    { title: 'React Native: Build Mobile Apps', description: 'Create cross-platform iOS and Android apps using your existing React knowledge. Covers navigation, device APIs, push notifications, and App Store deployment.' },
    { title: 'Flutter & Dart Complete Guide', description: 'Build beautiful native-quality mobile apps with Google\'s Flutter framework. Learn Dart, state management with Riverpod, and publishing to both app stores.' },
    { title: 'iOS Development with Swift', description: 'Develop native iPhone and iPad apps using Swift and Xcode. Covers SwiftUI, UIKit, Core Data, networking, and TestFlight beta distribution.' },
    { title: 'Android Development with Kotlin', description: 'Build modern Android applications with Kotlin and Jetpack Compose. Learn MVVM architecture, Room database, Retrofit, and the Google Play publishing process.' },
    { title: 'Cross-Platform App Architecture', description: 'Design maintainable mobile apps that share logic across iOS and Android. Covers architecture patterns, dependency injection, and performance profiling.' },
    { title: 'Mobile UX Design Patterns', description: 'Apply proven UX patterns that delight mobile users and drive engagement. Covers gesture design, accessibility, onboarding flows, and A/B testing.' },
    // DevOps & Cloud (cat 4, topics 19-24)
    { title: 'Docker & Kubernetes for Developers', description: 'Containerize applications with Docker and orchestrate them at scale with Kubernetes. Learn deployments, services, ingress, secrets, and Helm charts.' },
    { title: 'CI/CD with GitHub Actions & Jenkins', description: 'Automate your build, test, and deployment workflows to ship software faster and safer. Build pipelines for web apps, containers, and infrastructure.' },
    { title: 'AWS Cloud Practitioner to Developer', description: 'Go from AWS fundamentals to deploying production applications on EC2, S3, RDS, and Lambda. Covers IAM, VPC networking, cost optimization, and the AWS CLI.' },
    { title: 'Infrastructure as Code with Terraform', description: 'Provision and manage cloud infrastructure reproducibly using Terraform and HCL. Covers modules, state management, remote backends, and GitOps workflows.' },
    { title: 'Linux System Administration', description: 'Gain hands-on command-line skills for managing Linux servers in production environments. Covers shell scripting, process management, networking, and security hardening.' },
    { title: 'Monitoring with Prometheus & Grafana', description: 'Build comprehensive observability stacks that detect and diagnose production issues fast. Set up metrics collection, alerting rules, and beautiful operational dashboards.' },
    // Cybersecurity (cat 5, topics 25-30)
    { title: 'Network Security Fundamentals', description: 'Understand how networks are secured and attacked through practical lab exercises. Covers firewalls, VPNs, intrusion detection, and secure network architecture.' },
    { title: 'Ethical Hacking & Penetration Testing', description: 'Learn to think like an attacker and systematically find vulnerabilities before adversaries do. Covers reconnaissance, exploitation, post-exploitation, and professional reporting.' },
    { title: 'Cryptography: Theory to Practice', description: 'Understand the mathematical foundations behind encryption and apply them in code. Covers symmetric and asymmetric crypto, PKI, TLS, and common cryptographic pitfalls.' },
    { title: 'Secure Coding in Python & JavaScript', description: 'Write code that resists OWASP Top 10 attacks through design, review, and testing. Learn to prevent injection, XSS, CSRF, insecure deserialization, and more.' },
    { title: 'Incident Response & Digital Forensics', description: 'Contain security breaches and investigate compromised systems with a structured methodology. Covers memory forensics, log analysis, malware triage, and writing incident reports.' },
    { title: 'Cloud Security Architecture', description: 'Design cloud environments that are secure by default across AWS, Azure, and GCP. Covers identity, data protection, threat modeling, and compliance frameworks.' },
  ];

  // Primary topic per course (topicId)
  const courseTopicId: Record<number, number> = {
    1:  8,   // HTML & CSS Bootcamp        → UX/UI
    2:  3,   // JavaScript                 → JavaScript
    3:  1,   // React Mastery              → React
    4:  4,   // Node.js Backend            → Node.js
    5:  2,   // TypeScript for React       → TypeScript
    6:  3,   // Full-Stack                 → JavaScript
    7:  5,   // Python for Data Science    → Python
    8:  6,   // Machine Learning           → Machine Learning
    9:  6,   // Deep Learning              → Machine Learning
    10: 7,   // Data Visualization         → Analytics
    11: 7,   // SQL & Databases            → Analytics
    12: 5,   // Big Data with Spark        → Python
    13: 1,   // React Native               → React
    14: 8,   // Flutter                    → UX/UI
    15: 8,   // iOS with Swift             → UX/UI
    16: 8,   // Android with Kotlin        → UX/UI
    17: 8,   // Cross-Platform Arch        → UX/UI
    18: 8,   // Mobile UX Patterns         → UX/UI
    19: 4,   // Docker & Kubernetes        → Node.js
    20: 4,   // CI/CD                      → Node.js
    21: 7,   // AWS                        → Analytics
    22: 7,   // Terraform                  → Analytics
    23: 4,   // Linux Admin                → Node.js
    24: 7,   // Monitoring                 → Analytics
    25: 10,  // Network Security           → SEO
    26: 3,   // Ethical Hacking            → JavaScript
    27: 5,   // Cryptography               → Python
    28: 5,   // Secure Coding              → Python
    29: 7,   // Incident Response          → Analytics
    30: 7,   // Cloud Security             → Analytics
  };

  const courses = courseData.map((c, i) => {
    const groupIndex = i % 6;
    const categoryId = Math.floor(i / 6) + 1;
    return {
      id: i + 1,
      title: c.title,
      description: c.description,
      image: `https://picsum.photos/seed/course${i + 1}/800/450`,
      basePrice: prices[groupIndex],
      durationWeeks: weeks[groupIndex],
      hours: hours[groupIndex],
      isFeatured: featuredIndices.has(i),
      categoryId,
      instructorId: (i % 12) + 1,
      topicId: courseTopicId[i + 1],
    };
  });

  await prisma.course.createMany({ data: courses });

  const schedules: {
    id: number;
    courseId: number;
    weeklyScheduleId: number;
    timeSlotId: number;
    sessionType: SessionType;
    priceModifier: number;
    totalSeats: number;
    location: string | null;
  }[] = [];

  let scheduleId = 1;
  for (const course of courses) {
    const combos = course.isFeatured ? FEATURED_COMBOS : NON_FEATURED_COMBOS;
    combos.forEach(([w, t], idx) => {
      const sType = SESSION_TYPES[idx];
      schedules.push({
        id: scheduleId++,
        courseId: course.id,
        weeklyScheduleId: w,
        timeSlotId: t,
        sessionType: sType,
        priceModifier: priceModifier(sType),
        totalSeats: totalSeats(sType),
        location: location(sType),
      });
    });
  }

  await prisma.courseSchedule.createMany({ data: schedules });

  // Demo user with pre-seeded enrollments so Continue Learning looks populated
  const demoPassword = await bcrypt.hash('Demo1234!', 10);
  const demoUser = await prisma.user.create({
    data: {
      username: 'demouser',
      email: 'demo@bootcamp.dev',
      password: demoPassword,
      fullName: 'Demo User',
      mobileNumber: '+995555123456',
      age: 25,
    },
  });

  // Enroll demo user in 3 courses with varying progress
  // course 3 (React Mastery, featured)  → scheduleId 9  (Mon-Wed, 9-11am)
  // course 9 (Deep Learning, featured)  → scheduleId 38 (Tue-Thu, 5-7pm)
  // course 6 (Full-Stack, non-featured) → scheduleId 26 (Fri-Sat, 5-7pm)
  const demoEnrollments = [
    { userId: demoUser.id, courseId: 3, courseScheduleId: 9,  progress: 65,  completedAt: null },
    { userId: demoUser.id, courseId: 9, courseScheduleId: 38, progress: 30,  completedAt: null },
    { userId: demoUser.id, courseId: 6, courseScheduleId: 26, progress: 100, completedAt: new Date() },
  ];
  await prisma.enrollment.createMany({ data: demoEnrollments });

  // Seed a few reviews from demo user so courses show ratings
  await prisma.review.createMany({
    data: [
      { userId: demoUser.id, courseId: 3, rating: 5 },
      { userId: demoUser.id, courseId: 9, rating: 4 },
      { userId: demoUser.id, courseId: 6, rating: 5 },
    ],
  });

  console.log(`Seeded:`);
  console.log(`  Categories: 5`);
  console.log(`  Topics: 10`);
  console.log(`  Instructors: 12`);
  console.log(`  Courses: ${courses.length}`);
  console.log(`  Schedules: ${schedules.length}`);
  console.log(`  Demo user: demo@bootcamp.dev / Demo1234!`);
  console.log(`  Demo enrollments: 3 (65%, 30%, 100%)`);
  console.log(`  Demo reviews: 3`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
