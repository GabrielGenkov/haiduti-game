import { Rule } from './rule';

const rules: Rule[] = [];
let sorted = false;

export function registerRule(rule: Rule): void {
  rules.push(rule);
  sorted = false;
}

export function getAllRules(): readonly Rule[] {
if (!sorted) {
    rules.sort((a, b) => a.priority - b.priority);
    sorted = true;
  }
  return rules;
}
