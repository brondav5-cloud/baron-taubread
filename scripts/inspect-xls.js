const fs = require('fs');
const buf = fs.readFileSync('C:/Users/\u05d3\u05d5\u05d3 \u05d1\u05e8\u05d5\u05df/Downloads/2805 \u05d9\u05e0\u05d5\u05d0\u05e8.xls');
const text = buf.toString('utf8');

// Find table headers (look for row with multiple cells containing Hebrew column names)
const tables = text.match(/<table[\s\S]*?<\/table>/gi) || [];
console.log('Tables found:', tables.length);

tables.forEach((table, ti) => {
  const trs = table.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  if (trs.length < 2) return;
  
  // Check if table has useful data
  const sample = table.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
  if (sample.length < 20) return;
  
  console.log('\n=== TABLE', ti, '===');
  console.log('TRs:', trs.length);
  trs.slice(0, 6).forEach((tr, i) => {
    const tds = tr.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
    const cells = tds.map(td => td.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()).filter(c => c.length > 0 && c.length < 100);
    if (cells.length > 0) {
      console.log('  row'+i+' ('+cells.length+' cells):', JSON.stringify(cells));
    }
  });
});
