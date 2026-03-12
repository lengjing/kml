import { Lexer } from './lexer/lexer';
import { Parser } from './parser/parser';
import { ASTGenerator } from './codegen/ast-generator';

const source = `
package VehicleModel {
  abstract class Vehicle {
    feature mass : Real;
    feature maxSpeed : Real [1];
  }

  class Car :> Vehicle {
    feature engine : Engine [1];
    feature doors : Integer [1] = 4;
  }

  datatype Real;
  datatype Integer;

  enum FuelType {
    gasoline;
    diesel;
    electric;
  }

  function calculateRange(in capacity : Real, in efficiency : Real) : Real;

  predicate isElectric(in vehicle : Vehicle);

  connector powerTrain from Car::engine to Car;

  comment about Vehicle
    "Base class for all vehicles";
}
`;

// 1. 解析
const lexer = new Lexer(source);
const tokens = lexer.tokenize();
const parser = new Parser(tokens);
const ast = parser.parse();

// 2. 重新生成
const generator = new ASTGenerator({
  blankLineBetweenMembers: true,
  headerComment: 'Re-generated from AST',
});
const output = generator.generate(ast);

console.log(output);