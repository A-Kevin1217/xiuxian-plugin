const fs = require('fs');
const path = require('path');

const realmsPath = path.join(__dirname, '..', 'resources', 'realms.json');
const skillsPath = path.join(__dirname, '..', 'resources', 'skills.json');
const forbiddenWordsPath = path.join(__dirname, 'forbidden_words.json');

const realms = JSON.parse(fs.readFileSync(realmsPath, 'utf8'));
const skills = JSON.parse(fs.readFileSync(skillsPath, 'utf8'));
const forbiddenWords = JSON.parse(fs.readFileSync(forbiddenWordsPath, 'utf8'));

module.exports = {
  realms,
  skills,
  forbiddenWords
};