import test from 'node:test';
import assert from 'node:assert/strict';
import {freshRating} from '../js/rating.js';
const checked = Date.parse('2026-10-04T20:01:00Z');
const data = {score:8.9,reviewCount:104,checkedAt:'2026-10-04T20:01:00Z',maxAgeDays:60};
test('rating is visible through its freshness boundary, then falls back',()=>{
  assert.equal(freshRating(data,checked),true);
  assert.equal(freshRating(data,checked+60*86400000),true);
  assert.equal(freshRating(data,checked+60*86400000+1),false);
});
test('future or invalid verification dates do not show a score',()=>{
  assert.equal(freshRating(data,checked-1),false);
  assert.equal(freshRating({...data,checkedAt:'bad'},checked),false);
});
test('missing and invalid rating facts fail safely',()=>{
  for(const patch of [{score:NaN},{score:Infinity},{score:10.1},{score:-1},{score:'8.9'},{reviewCount:0},{reviewCount:1.5},{maxAgeDays:0}])
    assert.equal(freshRating({...data,...patch},checked),false);
  assert.equal(freshRating(null,checked),false);
});
