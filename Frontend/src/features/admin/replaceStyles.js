const fs = require('fs');
const files = [
  'e:/my-project/EzProject/Frontend/src/features/admin/AdminProjectsPage.tsx',
  'e:/my-project/EzProject/Frontend/src/features/admin/AdminUsersPage.tsx',
  'e:/my-project/EzProject/Frontend/src/features/admin/AdminLogsPage.tsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/ style={{ borderColor: '#E8D8CF' }}/g, '');
  content = content.replace(/ style={{ borderColor: '#F0E5DA' }}/g, '');
  content = content.replace(/ style={{ backgroundColor: '#FAF6F1' }}/g, ' className="bg-slate-50 border-b border-slate-200"');
  
  // Replace the filter active button styles
  content = content.replace(/className="px-3 py-1\.5 text-xs font-semibold transition-colors"[\s\S]*?style={active \? { backgroundColor: '#1f2937', color: 'white' } : { color: '#635648' }}/g, 'className={`px-3 py-1.5 text-xs font-semibold transition-all rounded-md ${active ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:bg-slate-100"}`}');
  
  // Replace hover style in AdminLogsPage
  content = content.replace(/style={{\n\s*backgroundColor: hover \? '#FAF6F1' : 'transparent',\n\s*}}/g, 'className={`${hover ? "bg-slate-50" : "bg-transparent"}`}');

  content = content.replace(/rounded-2xl border bg-white/g, 'rounded-xl border border-slate-200 bg-white shadow-sm');
  
  fs.writeFileSync(f, content);
});
console.log('Styles replaced successfully!');
