require('dotenv').config({ path: '.env', override: true });
const { Pool } = require('pg');
const url = process.env.DATABASE_URL;
const p = new Pool({ connectionString: url });
(async () => {
  const r = await p.query('SELECT id, code, label_en, label_ar FROM visit_reasons ORDER BY "displayOrder" LIMIT 4');
  console.log(JSON.stringify(r.rows, null, 2));
  const c = await p.query(
    `SELECT
       (SELECT count(*) FROM visit_reasons) vr,
       (SELECT count(*) FROM vehicle_condition_options) vc,
       (SELECT count(*) FROM vehicle_item_options) vi,
       (SELECT count(*) FROM visit_reasons WHERE label_ar IS NULL OR label_en IS NULL) vr_nulls,
       (SELECT count(*) FROM vehicle_condition_options WHERE label_ar IS NULL OR label_en IS NULL) vc_nulls,
       (SELECT count(*) FROM vehicle_item_options WHERE label_ar IS NULL OR label_en IS NULL) vi_nulls`,
  );
  console.log(JSON.stringify(c.rows[0]));
  await p.end();
})().catch(async (e) => { console.error(e.message); await p.end(); process.exit(1); });
