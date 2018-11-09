define([], function() {
  "use strict";

  const FUNCTIONS = {
    abs: { nargs: 1, func: Math.abs },
    sqrt: { nargs: 1, func: Math.sqrt },
    cbrt: { nargs: 1, func: Math.cbrt },
    sin: { nargs: 1, func: Math.sin },
    cos: { nargs: 1, func: Math.cos },
    tan: { nargs: 1, func: Math.tan },
    sec: { nargs: 1, func: (x => 1/Math.cos(x)) },
    csc: { nargs: 1, func: (x => 1/Math.sin(x)) },
    cot: { nargs: 1, func: (x => Math.cos(x)/Math.sin(x)) },
    arcsin: { nargs: 1, func: Math.asin },
    arccos: { nargs: 1, func: Math.acos },
    arctan: { nargs: 1, func: Math.atan },
    arcsec: { nargs: 1, func: (x => Math.acos(1/x)) },
    arccsc: { nargs: 1, func: (x => Math.asin(1/x)) },
    arccot: { nargs: 1, func: (x => Math.atan(1/x)) },
    log2: { nargs: 1, func: Math.log2 },
    log10: { nargs: 1, func: Math.log10 },
    ln: { nargs: 1, func: Math.log },
    log: { nargs: 2, func: (x, base) => Math.log(x) / Math.log(base) }
  };

  const CONSTANTS = {
    e: Math.E,
    pi: Math.PI
  };

  const createKeyRegex = obj => new RegExp('^(' + Object.getOwnPropertyNames(obj).join('|') + ')');
  const TOKEN_SPEC = [
    { name: 'number', regex: /^[0-9]+\.[0-9]+/ },
    { name: 'number', regex: /^[0-9]+\./ },
    { name: 'number', regex: /^\.[0-9]+/ },
    { name: 'number', regex: /^[0-9]+/ },
    { name: 'function', regex: createKeyRegex(FUNCTIONS) },
    { name: 'constant', regex: createKeyRegex(CONSTANTS) },
    { name: 'var', regex: /^(theta|\w)/ },
    { name: 'operator', regex: /^[+\-*/^|(),]/ },
    { name: 'space', regex: /^\s+/ }
  ];

  function* tokenizeExpression(mathString) {
    while (mathString !== "") {
      let matched = false;
      for (const spec of TOKEN_SPEC) {
        if (spec.regex.test(mathString)) {
          const string = spec.regex.exec(mathString)[0];
          mathString = mathString.slice(string.length);
          if (spec.name !== 'space') {
            yield { type: spec.name, value: string };
          }
          matched = true;
          break;
        }
      }

      if (!matched) {
        throw new Error("I don't know what " + mathString + " means");
      }
    }
  }

  function tokenMatches(token, props) {
    for (const key of Object.getOwnPropertyNames(props)) {
      if (token[key] !== props[key]) {
        return false;
      }
    }
    return true;
  }

  class TokenIterator {
    constructor(generator) {
      this._generator = generator;
      this._comingSoon = null;
    }

    _callNext(errorOnEOF) {
      const next = this._generator.next();
      if (next.done) {
        if (errorOnEOF) {
          throw new Error("unexpected end of math");
        }
        return null;
      }
      if (next.value === null) {
        throw new Error("unexpected null");
      }
      return next.value;
    }

    eof() {
      if (this._comingSoon !== null) {
        return false;
      }
      this._comingSoon = this._callNext(false);
      return (this._comingSoon === null);
    }

    comingUp(props) {
      if (this._comingSoon === null) {
        this._comingSoon = this._callNext(true);
      }
      return tokenMatches(this._comingSoon, props);
    }

    nextToken(props) {
      let result;
      if (this._comingSoon === null) {
        result = this._callNext(true);
      } else {
        result = this._comingSoon;
        this._comingSoon = null;
      }

      if (!tokenMatches(result, props)) {
        throw new Error("unexpected token: " + result.value);
      }
      return result;
    }
  }

  class Parser {
    constructor(tokenGenerator, allowedVarNames) {
      this.iter = new TokenIterator(tokenGenerator);
      this.varNames = allowedVarNames;
    }

    expressionComingUp() {
      return (
        this.iter.comingUp({ type: 'operator', value: '+' }) ||
        this.iter.comingUp({ type: 'operator', value: '-' }) ||
        this.iter.comingUp({ type: 'var' }) ||
        this.iter.comingUp({ type: 'function' }) ||
        this.iter.comingUp({ type: 'operator', value: '(' }) ||
        this.iter.comingUp({ type: 'constant' }) ||
        this.iter.comingUp({ type: 'number' }));
    }

    parseExpressionWithoutBinaryOperators() {
      if (this.iter.comingUp({ type: 'var' })) {
        const varName = this.iter.nextToken({ type: 'var' }).value;
        if (!this.varNames.includes(varName)) {
          throw new Error("unknown variable: " + varName);
        }
        return { type: 'var', name: varName };
      }

      if (this.iter.comingUp({ type: 'constant' })) {
        const token = this.iter.nextToken({ type: 'constant' });
        return { type: 'number', value: CONSTANTS[token.value] };
      }

      if (this.iter.comingUp({ type: 'function' })) {
        // this assumes that all functions take exactly 1 argument
        // i tried to make this work without () but parseExpression() always
        // wanted to parse as much as possible, so sqrtxsqrty was parsed as
        // sqrt(x*sqrt(y)), and because x was treated same as (x),
        // sqrt(x)*sqrt(y) was also parsed as sqrt(x*sqrt(y))
        const functionToken = this.iter.nextToken({ type: 'function' });
        const functionInfo = FUNCTIONS[functionToken.value];
        if (functionInfo === undefined) {
          throw new Error("unknown function name: " + functionToken.value);
        }
        if (functionInfo.nargs < 1) {
          throw new Error("wut? nargs < 1 of function " + functionToken.value);
        }

        this.iter.nextToken({ type: 'operator', value: '(' });
        const args = [this.parseExpression()];
        for (let i=1; i < functionInfo.nargs; i++) {
          this.iter.nextToken({ type: 'operator', value: ',' });
          args.push(this.parseExpression());
        }
        this.iter.nextToken({ type: 'operator', value: ')' });

        return { type: 'functionCall', func: functionInfo.func, args: args };
      }

      if (this.iter.comingUp({ type: 'operator', value: '(' })) {
        this.iter.nextToken({ type: 'operator', value: '(' });
        const result = this.parseExpression();
        this.iter.nextToken({ type: 'operator', value: ')' });
        return result;
      }

      if (this.iter.comingUp({ type: 'number' })) {
        return { type: 'number', value: +this.iter.nextToken({ type: 'number' }).value };
      }

      throw new Error("don't know how to parse " + this.iter.nextToken({}).value);
    }

    binaryOperatorComingUp() {
      for (const binaryOperator of '+-*/^') {
        if (this.iter.comingUp({ type: 'operator', value: binaryOperator })) {
          return true;
        }
      }
      return false;
    }

    parseExpression() {
      // this must be here and NOT in parseExpressionWithoutBinaryOperators
      // because -x^2-y must be always 0-x^2-y, and this is the most robust way
      // to ensure it i could think of
      let minusing = false;
      if (this.iter.comingUp({ type: 'operator', value: '+' })) {
        this.iter.nextToken({ type: 'operator', value: '+' });
      } else if (this.iter.comingUp({ type: 'operator', value: '-' })) {
        this.iter.nextToken({ type: 'operator', value: '-' });
        minusing = true;
      }

      // things with even indexes are ast objects
      // things with odd indexes are operator name strings
      const funnyStuff = [ this.parseExpressionWithoutBinaryOperators() ];

      if (minusing) {
        // add "0 -" in front of all the things
        funnyStuff.splice(0, 0, { type: 'number', value: 0 }, '-');
      }

      while (!this.iter.eof() && (this.expressionComingUp() || this.binaryOperatorComingUp())) {
        if (this.binaryOperatorComingUp()) {
          funnyStuff.push(this.iter.nextToken({ type: 'operator' }).value);
        } else {
          funnyStuff.push("*");
        }
        funnyStuff.push(this.parseExpressionWithoutBinaryOperators());
      }

      // replace operators with binaryOp ast nodes
      for (const operators of ['^', '*/', '+-']) {
        const indexes = [];
        for (const op of operators) {
          funnyStuff.forEach((stringOrAst, index) => {
            if (stringOrAst === op) {
              indexes.push(index);
            }
          });
        }

        // the indexes must be sorted if there's more than 1 operator
        // the indexes must NOT be reversed because then x-y-z would be
        // interpreted as x-(y-z) instead of (x-y)-z
        indexes.sort((i, j) => i-j);

        // this is funny and dumb and awesome
        while (indexes.length !== 0) {
          const i = indexes.shift();
          const [ lhs, op, rhs ] = funnyStuff.splice(i-1, 3);
          const opAst = { type: 'operatorCall', operator: op, lhs: lhs, rhs: rhs };
          funnyStuff.splice(i-1, 0, opAst);

          // 3 funnyStuff elements were replaced with just 1, so adjust indexes
          for (let i = 0; i < indexes.length; i++) {
            indexes[i] -= 2;
          }
        }
      }

      if (funnyStuff.length !== 1) {
        throw new Error("something weird happened");
      }
      return funnyStuff[0];
    }
  }

  function parse(mathString, allowedVarNames) {
    const parser = new Parser(tokenizeExpression(mathString), allowedVarNames);
    const result = parser.parseExpression();
    if (!parser.iter.eof()) {
      throw new Error("the math contains something invalid at the end");
    }
    return result;
  }

  function evaluate(ast, varValues) {
    switch (ast.type) {
    case 'operatorCall':
      switch (ast.operator) {
      case '+': return evaluate(ast.lhs, varValues) + evaluate(ast.rhs, varValues);
      case '-': return evaluate(ast.lhs, varValues) - evaluate(ast.rhs, varValues);
      case '*': return evaluate(ast.lhs, varValues) * evaluate(ast.rhs, varValues);
      case '/': return evaluate(ast.lhs, varValues) / evaluate(ast.rhs, varValues);
      case '^': return Math.pow(evaluate(ast.lhs, varValues), evaluate(ast.rhs, varValues));
      default: throw new Error("unsupported operator: " + ast.operator);
      }
    case 'var':
      return varValues[ast.name];
    case 'number':
      return ast.value;
    case 'functionCall':
      return ast.func(...ast.args.map(arg => evaluate(arg, varValues)));
    default:
      throw new Error("unsupported ast expression type " + ast.type);
    }
  }

  return { parse: parse, evaluate: evaluate };
});
