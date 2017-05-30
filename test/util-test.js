const chai = require("chai");
const expect = chai.expect
const util = require("../src/util")
const batchArrayItems = util.batchArrayItems

describe('Util test', function() {
  it('batchArrayItems', function() {

    expect(batchArrayItems([], 1)).to.deep.equal([])

    expect(batchArrayItems(["a"], 1)).to.deep.equal([
      ["a"]
    ])

    expect(batchArrayItems(["a", "b"], 1)).to.deep.equal([
      ["a"],
      ["b"]
    ])

    expect(batchArrayItems(["a", "b", "c"], 2)).to.deep.equal([
      ["a", "b"],
      ["c"]
    ])

    expect(batchArrayItems(["blue", "green", "red", "yellow", "pink"], 2)).to.deep.equal([
      ["blue", "green"],
      ["red", "yellow"],
      ["pink"]
    ])

    expect(batchArrayItems(["blue", "green", "red", "yellow", "pink"], 3)).to.deep.equal([
      ["blue", "green", "red"],
      ["yellow", "pink"]
    ])

    expect(batchArrayItems(["blue", "green", "red", "yellow", "pink"], 100)).to.deep.equal([
      ["blue", "green", "red", "yellow", "pink"]
    ])

  })
})