const tseslint = require('typescript-eslint');
const path = require('node:path');
const architecture = {
 meta: {type:'problem',schema:[],messages:{forbidden:'Dependency {{target}} is forbidden from {{layer}}.'}},
 create(context) {
  const filename=context.filename.replaceAll('\\','/');
  const layer=filename.match(/\/src\/(domain|application|presentation)\//)?.[1];
  const denied={domain:['application','data','presentation'],application:['data','presentation'],presentation:['data']};
  function check(node,source) {
   if (!layer || typeof source!=='string') return;
   const resolved=source.startsWith('.') ? path.resolve(path.dirname(context.filename),source).replaceAll('\\','/') : source;
   const forbiddenLayer=(denied[layer] || []).some(other=>resolved.includes('/src/'+other+'/'));
   const forbiddenPackage=layer==='domain' ? /^(?:@nestjs(?:\/|$)|typeorm(?:\/|$)|express(?:\/|$)|socket\.io(?:\/|$))/.test(source) : layer==='application' && /^typeorm(?:\/|$)/.test(source);
   if (forbiddenLayer || forbiddenPackage) context.report({node,messageId:'forbidden',data:{target:source,layer}});
  }
  return {ImportDeclaration:n=>check(n,n.source.value),ExportNamedDeclaration:n=>check(n,n.source?.value),ExportAllDeclaration:n=>check(n,n.source.value),ImportExpression:n=>check(n,n.source.value),CallExpression:n=>{if(n.callee.name==='require' && n.arguments[0]?.type==='Literal') check(n,n.arguments[0].value);}};
 }
};
module.exports=tseslint.config(
 {ignores:['dist/**','node_modules/**','coverage/**']},
 ...tseslint.configs.recommended,
 {files:['**/*.ts'],plugins:{layers:{rules:{boundaries:architecture}}},rules:{'layers/boundaries':'error','@typescript-eslint/no-explicit-any':'off','@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_'}]}},
 {files:['**/*.cjs'],rules:{'@typescript-eslint/no-require-imports':'off'}}
);
