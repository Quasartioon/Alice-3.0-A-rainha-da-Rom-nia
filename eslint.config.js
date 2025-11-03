const js = require('@eslint/js');

module.exports = [
	js.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 'latest',
		},
		env: {
      		node: true,       // <<-- isso permite require, process, console, __dirname, etc
      		es2021: true      // suporte a recursos modernos do JS
    	},
		"rules": {
			semi: ['error', 'always'],						  // ponto e vírgula obrigatório
			quotes: ['error', 'single'],        			  // aspas simples obrigatórias
			'no-var': 'error',                  			  // não usar var, só let/const
			'prefer-const': 'error',             			  // use const sempre que possível
			"no-unused-vars": "warn",						  // variáveis declaradas mas não usadas, apenas aviso
			"no-multiple-empty-lines": ["warn", { "max": 5 }],// linhas em branco apenas aviso
			"indent": ["warn", "tab"],    					  // indentação com tab apenas aviso
			'no-undef': 'error',                 			  // variáveis indefinidas
		}
	},
];