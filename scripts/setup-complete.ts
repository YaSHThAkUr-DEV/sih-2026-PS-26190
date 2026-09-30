import { execSync } from 'child_process';
import * as path from 'path';

function runStep(title: string, scriptFile: string) {
  console.log(`\n========================================================================`);
  console.log(`  STEP: ${title}`);
  console.log(`========================================================================`);
  try {
    const scriptPath = path.resolve(__dirname, scriptFile);
    execSync(`npx tsx "${scriptPath}"`, { stdio: 'inherit', env: process.env });
    console.log(`✅ Completed: ${title}`);
  } catch (err: any) {
    console.error(`❌ Error in ${title}:`, err.message);
    throw err;
  }
}

async function main() {
  console.log('🏛️  NIRMAN DMS: 1-CLICK AUTOMATED SYSTEM SETUP & INITIALIZATION');
  console.log('Starting full database migration, schema setup, and demo data seeding...\n');

  // Step 1: Initialize Database & Base Tables
  runStep('1. Initialize Database & Base Schema (schema.sql)', 'init-db.ts');

  // Step 2: Additive Migrations
  runStep('2. Apply Federation & Collaboration Schema', 'migrate-collaboration.ts');
  runStep('3. Apply Retention & Legal Hold Schema', 'migrate-retention-schema.ts');
  runStep('4. Apply Notifications Schema', 'migrate-notifications-schema.ts');

  // Step 3: Seeding Realistic Sovereign Data
  runStep('5. Seed 5 Sovereign Government Agencies & Personas', 'seed-5-government-orgs.ts');
  runStep('6. Seed Inter-Agency Requisitions & Collaboration', 'seed-collaboration.ts');
  runStep('7. Seed Statutory Retention Schedules & Moratoriums', 'seed-retention-policies.ts');

  // Step 4: Health Diagnostics
  runStep('8. System Verification & Health Check', 'verify-all-connections.ts');

  console.log('\n🎉 ========================================================================');
  console.log('  NIRMAN DMS SETUP COMPLETED SUCCESSFULLY!');
  console.log('  You can now start the application with: npm run dev');
  console.log('  Access Dashboard at: http://localhost:3000');
  console.log('========================================================================\n');
}

main().catch((err) => {
  console.error('\n❌ Setup process encountered a fatal error:', err);
  process.exit(1);
});
