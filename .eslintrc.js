module.exports = {
    root: true,
    /**
     * 扩展->采用 AlloyTeam 的 ESLintConfig
     * @see https://github.com/AlloyTeam/eslint-config-alloy
     */
    extends: ['alloy', 'alloy/typescript', 'plugin:eqeqeq-fix/recommended'],
    /**
     * 适用环境
     */
    env: {
        node: true,
        browser: true
    },
    /**
     * 解析器：使用 ESLint 解析 TypeScript 语法
     */
    parser: '@typescript-eslint/parser',
    /**
     * ESLint 插件
     */
    plugins: ['@typescript-eslint', 'unused-imports', 'autofix'],
    globals: {
        /**
         * 指定Cocos Creator相关全局变量，这样子就不会触发 no-undef 的规则
         */
        Decimal: 'readonly',
        CryptoJS: 'readonly',
        jsb: 'readonly',
        Editor: 'readonly',
        globalThis: 'readonly',
        protobuf: 'readonly',
        gg: 'readonly',
        logger: 'readonly'
    },
    /**
     * 默认规则
     *
     * @see https://eslint.org/docs/rules/
     * @see https://github.com/typescript-eslint/typescript-eslint/blob/master/packages/eslint-plugin/docs/rules
     */
    rules: {
        /** 在每条语句的末尾添加一个分号 */
        semi: ['error', 'always'],
        /** 禁止修改原生对象,排除的类型可以扩展 */
        'no-extend-native': ['error', { exceptions: ['String', 'Number', 'Date', 'Array'] }],
        /** 字符串指定使用单引号 */
        'autofix/quotes': ['error', 'single'],
        /** 禁止使用console */
        'autofix/no-console': ['error'],
        /** 禁止使用debugger */
        'autofix/no-debugger': ['error'],
        /** 必须使用===，禁止使用== */
        'eqeqeq-fix/eqeqeq': ['error'],
        /** 当导入的东西未被使用时报错提示 */
        'unused-imports/no-unused-imports': 'error',
        /** 禁止将自己赋值给自己,属性可以 */
        'no-self-assign': ['error', { props: false }],
        /** 控制环复杂度最大值为25（默认20），超过后警告(默认是报错) */
        complexity: ['error', { max: 25 }],
        /** 代码块嵌套的深度禁止超过 6 层 */
        'max-depth': ['error', { max: 6 }],
        /** 函数最多参数数量为 6个，超过之后警告，默认值是 3 */
        'max-params': ['warn', 6],
        /** 限制数组类型必须使用 Array<T> 或 T[] */
        '@typescript-eslint/array-type': ['error'],
        /** 指定类成员的排序规则 */
        '@typescript-eslint/member-ordering': 'off',
        /** method 和 property 不需要显式声明 public 访问修饰符 */
        '@typescript-eslint/explicit-member-accessibility': ['error', { accessibility: 'no-public' }],
        /** 禁止将 this 赋值给其他变量，除非是解构赋值 */
        '@typescript-eslint/no-this-alias': ['error', { allowDestructuring: true, allowedNames: ['self'] }],
        /** 不允许对初始化为数字、字符串或布尔值的变量或参数进行显式类型声明 */
        '@typescript-eslint/no-inferrable-types': ['error', { ignoreParameters: true, ignoreProperties: true }],
        /** 类型断言必须使用 as */
        '@typescript-eslint/consistent-type-assertions': [
            'error',
            { assertionStyle: 'as', objectLiteralTypeAssertions: 'allow' }
        ],
        camelcase: [
            'error',
            { properties: 'always', ignoreDestructuring: true, ignoreImports: true, ignoreGlobals: true, allow: [] }
        ]
    }
};
