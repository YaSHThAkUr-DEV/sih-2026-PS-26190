import { pool, query } from '../lib/db';

async function updateTiers() {
  try {
    await query(`
      UPDATE taxonomy_priority_tiers 
      SET name = 'Court Mandate' 
      WHERE code = 'COURT_MANDATE';
      
      UPDATE taxonomy_priority_tiers 
      SET name = 'Urgent Warrant' 
      WHERE code = 'URGENT_WARRANT';
      
      UPDATE taxonomy_priority_tiers 
      SET name = 'High Priority' 
      WHERE code = 'HIGH_PRIORITY';
      
      UPDATE taxonomy_priority_tiers 
      SET name = 'Standard Routine' 
      WHERE code = 'ROUTINE';
    `);
    const updated = await query('SELECT code, name, sla_hours, badge_color FROM taxonomy_priority_tiers');
    console.log('Successfully updated priority tiers:', updated);
  } catch (err) {
    console.error('Error updating priority tiers:', err);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

updateTiers();
