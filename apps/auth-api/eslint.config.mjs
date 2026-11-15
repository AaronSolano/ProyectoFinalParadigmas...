import tseslint from 'typescript-eslint';
const restrictions = (layers, packages = []) => ({
  'no-restricted-imports': ['error', {
    patterns: [
      ...layers.map(layer => ({ regex: `(^|/)${layer}(/|$)`, message: `Esta capa no puede depender de ${layer}.` })),
      ...packages.map(name => ({ regex: `^${name}(/|$)`, message: 'Las reglas deben permanecer independientes de adaptadores.' })),
    ],
  }],
});
export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', 'coverage/**'] },
  ...tseslint.configs.recommended,
  { files: ['**/*.ts'], rules: { '@typescript-eslint/no-explicit-any': 'error' } },
  { files: ['src/domain/**/*.ts'], rules: restrictions(['application', 'data', 'presentation'], ['@nestjs', 'typeorm', 'express', 'socket\\.io']) },
  { files: ['src/application/**/*.ts'], rules: restrictions(['data', 'presentation'], ['typeorm']) },
  { files: ['src/presentation/**/*.ts'], rules: restrictions(['data']) },
  { files: ['**/*.cjs'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
);
