module.exports = {
  "extends" : [
    "standard",
    "plugin:promise/recommended"
  ],
  "plugins": [
    "promise"
  ],
  "env": {
    "browser" : true,
    "node"    : true,
    "mocha"   : true,
    "jest"    : true
  },
  "globals" : {
    "artifacts": false,
    "contract": false,
    "assert": false,
    "web3": false
  },
  "rules": {
    "strict": ["error", "global"],
    "camelcase": ["error", {"properties": "always"}],
    "comma-dangle": ["warn", "always-multiline"],
    "comma-spacing": ["error", {"before": false, "after": true}],
    "dot-notation": ["error", {"allowKeywords": true, "allowPattern": ""}],
    "eol-last": ["error", "always"],
    "eqeqeq": ["error", "smart"],
    "generator-star-spacing": ["error", "before"],
    "indent": ["error", 2],
    "linebreak-style": ["error", "unix"],
    "no-debugger": "off",
    "no-dupe-args": "error",
    "no-dupe-keys": "error",
    "no-multi-spaces": ["error", {"ignoreEOLComments":true}],
    "no-mixed-spaces-and-tabs": ["error", "smart-tabs"],
    "no-redeclare": ["error", {"builtinGlobals": true}],
    "no-trailing-spaces": ["error", { "skipBlankLines": false }],
    "no-undef": "error",
    "no-use-before-define": "off",
    "no-var": "error",
    "object-curly-spacing": ["error", "always"],
    "prefer-const": "error",
    "quotes": ["error", "single"],
    "semi": ["error", "always"],
    "space-before-function-paren": ["error", "always"],
    "promise/always-return": "off",
    "promise/avoid-new": "off",
    "curly": ["error", "multi" ]
  }
};
