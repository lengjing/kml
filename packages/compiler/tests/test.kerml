// ============================================================
// KerML Test File - Comprehensive Language Feature Coverage
// ============================================================

package TestPackage {

  // ---- Basic Types ----
  datatype Real;
  datatype Integer;
  datatype String;
  datatype Boolean;

  // ---- Abstract Class ----
  abstract class Base {
    feature id : Integer [1];
    feature name : String [0..1];
  }

  // ---- Class with specialization ----
  class Derived :> Base {
    feature description : String;
    feature value : Real [1];
    feature name : String [1] :>> Base::name;
  }

  // ---- Struct ----
  struct Point {
    feature x : Real;
    feature y : Real;
    feature z : Real;
  }

  // ---- DataType with features ----
  datatype Vector3 {
    feature x : Real;
    feature y : Real;
    feature z : Real;
  }

  // ---- Enumeration ----
  enum Status {
    active;
    inactive;
    pending;
    completed;
  }

  // ---- Association ----
  assoc ContainmentRelation {
    end feature container : Base [1];
    end feature contained : Base [*];
  }

  // ---- Feature varieties ----
  class FeatureShowcase {
    attribute attr1 : Integer;
    in feature inputVal : Real;
    out feature outputVal : Real;
    inout feature bidirectional : String;
    readonly feature constant : Integer = 42;
    derived feature computed : Real;
    composite feature child : Base [0..*];
    ordered feature sequence : Integer [*];
    feature optional : String [0..1];
  }

  // ---- Behavior and Steps ----
  behavior Process {
    in feature input : Base;
    out feature output : Base;

    step step1 : SubProcess;
    step step2 : SubProcess;

    succession step1 then step2;
  }

  behavior SubProcess;

  // ---- Function ----
  function add(in a : Real, in b : Real) : Real;
  function multiply(in x : Real, in y : Real) : Real;

  // ---- Predicate ----
  predicate isValid(in item : Base);

  // ---- Connector ----
  connector link from FeatureShowcase::inputVal to FeatureShowcase::outputVal;

  // ---- Binding Connector ----
  binding FeatureShowcase::attr1 = FeatureShowcase::constant;

  // ---- Multiplicity ----
  class Collection {
    feature items : Base [0..*] ordered nonunique;
    feature uniqueItems : Base [1..*] ordered;
    feature exactlyThree : Base [3];
  }

  // ---- Import examples ----
  package SubPackage {
    class SubClass :> Base {
      feature subValue : Integer;
    }
  }

  // ---- Metadata ----
  metaclass Safety;

  @Safety about Derived;

  // ---- Comments and Documentation ----
  comment about Base
    "This is the base class for all elements";

  doc "TestPackage contains comprehensive KerML test cases";
}