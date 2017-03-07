'use strict';
var yeoman = require('yeoman-generator'),
  chalk = require('chalk'),
  yosay = require('yosay'),
  nameValidator = require('validate-element-name');

module.exports = yeoman.Base.extend({
  prompting: function () {
    this.log(yosay(
      'Welcome to the ' + chalk.blue('Centular app shell') + ' generator!'
    ));

    var prompts = [{
      type: 'input',
      name: 'appName',
      message: 'What would you like to name your app element?',
      validate: this._validateAppName
    },{
      type: 'input',
      name: 'appHandle',
      message: 'What would you like your app handle to be?',
      default: this._guessAppHandle
    },{
      type: 'input',
      name: 'appTitle',
      message: 'What would you like your app title to be?',
      default: this._guessAppTitle
    },{
      type: 'input',
      name: 'appShortTitle',
      message: 'What would you like your app short title to be?',
      default: this._guessAppShortTitle
    }];

    return this.prompt(prompts).then((answers) => this.preferences = answers);
  },

  writing: function () {
    this.fs.copyTpl(
      [this.templatePath('**/*'), '!**/_*', '!images'],
      this.destinationPath(),
      this.preferences
    );
    this.fs.copy(
      this.templatePath('images/**'),
      this.destinationPath('images'),
      this.preferences
    );
    this.fs.copyTpl(
      this.templatePath('src/_some-app.html'),
      this.destinationPath(`src/${this.preferences.appName}.html`),
      this.preferences
    );
    this.fs.copyTpl(
      this.templatePath('src/_some-icons.html'),
      this.destinationPath(`src/${this.preferences.appHandle}-icons.html`),
      this.preferences
    );
    this.fs.copyTpl(
      this.templatePath('src/views/_some-signin.html'),
      this.destinationPath(`src/views/${this.preferences.appHandle}-signin.html`),
      this.preferences
    );
  },

  install: function () {
    this.log(chalk.bold('\nProject generated!\n'));
    this.log(chalk.yellow('Run ') + 'bower install' + chalk.yellow(' now to install dependencies'));
  },

  _validateAppName: function(name) {
    return new Promise((resolve) => {
      let result = nameValidator(name);
      resolve(result.isValid || result.message)
    });
  },

  _guessAppHandle: function(answers) {
    return new Promise((resolve) => resolve(answers.appName.replace('-app', '')));
  },

  _guessAppTitle: function(answers) {
    return answers.appName
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },

  _guessAppShortTitle: function(answers) {
    return answers.appTitle.split(' ')[0];
  }

});
