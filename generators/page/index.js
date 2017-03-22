'use strict';
var yeoman = require('yeoman-generator'),
  chalk = require('chalk'),
  yosay = require('yosay'),
  nameValidator = require('validate-element-name');

module.exports = yeoman.Base.extend({
  initializing: function() {
    this.polymerConfig = JSON.parse(this.fs.read('polymer.json'));
  },

  prompting: function () {
    this.log(yosay(
      'Welcome to the ' + chalk.blue('Centular app page') + ' generator!'
    ));

    var prompts = [{
      type: 'input',
      name: 'appName',
      message: 'What is your app element name?',
      default: this._guessAppName.bind(this)
    },{
      type: 'input',
      name: 'appHandle',
      message: 'What is your app handle?',
      default: this._guessAppHandle.bind(this)
    },{
      type: 'input',
      name: 'pageName',
      message: 'What would you like to name your page element?',
      validate: this._validatePageName
    },{
      type: 'input',
      name: 'pageTitle',
      message: 'What is the title?',
      default: this._guessTitle
    },{
      type: 'confirm',
      name: 'hasMenuItem',
      message: 'Should this page have a link in the drawer?',
      default: true
    },{
      type: 'input',
      name: 'menuTitle',
      message: 'What would you like your menu item display name to be?',
      default: this._guessTitle,
      when: this._isMenuItem
    },{
      type: 'input',
      name: 'menuIcon',
      message: 'What would you like your menu item icon to be?',
      default: 'icons:folder',
      when: this._isMenuItem
    },{
      type: 'confirm',
      name: 'isSubPage',
      message: 'Is this a sub page?',
      default: false,
      when: this._isMenuItem
    },{
      type: 'input',
      name: 'parentMenuItemName',
      message: 'Parent menu item name:',
      when: this._isSubPage
    },{
      type: 'confirm',
      name: 'isGuestVisible',
      message: 'Should this page be visible to an unauthenticated guest user?',
      default: false,
      when: this._isTopLevelPage
    },{
      type: 'confirm',
      name: 'isRefreshable',
      message: 'Should this page be refreshable?',
      default: true
    }];

    return this.prompt(prompts).then((answers) => this.preferences = answers);
  },

  writing: function () {
    // Generate the view
    this.preferences.elementName = `${this.preferences.appHandle}-${this.preferences.pageName}`;
    let elementFileName = `src/views/${this.preferences.elementName}.html`;
    this.fs.copyTpl(
      this.templatePath('view-element.html'),
      this.destinationPath(elementFileName),
      this.preferences
    );

    // Add the view to fragments in polymer.json
    this.polymerConfig.fragments.push(elementFileName);
    this.fs.writeJSON(this.destinationPath('polymer.json'), this.polymerConfig);

    // Read the app element
    let appElementFile = this.destinationPath(`src/${this.preferences.appName}.html`);
    let appElement = this.fs.read(appElementFile);

    // Add the view to the app iron-pages element
    let startOfPages = appElement.indexOf('<iron-pages role="main"');
    let endOfPages = appElement.indexOf('</iron-pages>', startOfPages);
    let appElementTopHalf = appElement.slice(0, endOfPages);
    let appElementBottomHalf = appElement.slice(endOfPages);
    let pageElement = '';
    if (this.preferences.isRefreshable) {
      pageElement = `  <${this.preferences.elementName} name="${this.preferences.pageName}" refreshing="{{ refreshing }}"></${this.preferences.elementName}>`;
    } else {
      pageElement = `  <${this.preferences.elementName} name="${this.preferences.pageName}"></${this.preferences.elementName}>`;
    }
    let updatedAppElement = [
      appElementTopHalf,
      pageElement,
      '\n        ', appElementBottomHalf
    ].join('');

    // Add page config
    let menuItem = '';
    if (this.preferences.hasMenuItem) {
      if (this.preferences.parentMenuItemName) {
        menuItem = `, CT.PageMenuItem('${this.preferences.menuTitle}', '/${this.preferences.pageName}', '${this.preferences.menuIcon}', '${this.preferences.parentMenuItemName}')`;
      } else {
        menuItem = `, CT.PageMenuItem('${this.preferences.menuTitle}', '/${this.preferences.pageName}', '${this.preferences.menuIcon}')`;
      }
    }
    startOfPages = updatedAppElement.indexOf('get pages()');
    endOfPages = updatedAppElement.indexOf('];', startOfPages);
    appElementTopHalf = updatedAppElement.slice(0, endOfPages);
    appElementBottomHalf = updatedAppElement.slice(endOfPages);
    updatedAppElement = [
      appElementTopHalf,
      `  CT.Page('${this.preferences.pageName}', '${this.preferences.pageTitle}'${menuItem}),`,
      '\n        ', appElementBottomHalf
    ].join('');

    // Add refreshable page config
    if (this.preferences.isRefreshable) {
      startOfPages = updatedAppElement.indexOf('get refreshablePages()');
      endOfPages = updatedAppElement.indexOf('];', startOfPages);
      appElementTopHalf = updatedAppElement.slice(0, endOfPages);
      appElementBottomHalf = updatedAppElement.slice(endOfPages);
      updatedAppElement = [
        appElementTopHalf,
        `'${this.preferences.pageName}',`,
        '\n        ', appElementBottomHalf
      ].join('');
    }

    // Add guest visible page config
    if (this.preferences.isGuestVisible) {
      startOfPages = updatedAppElement.indexOf('get guestPages()');
      endOfPages = updatedAppElement.indexOf('];', startOfPages);
      appElementTopHalf = updatedAppElement.slice(0, endOfPages);
      appElementBottomHalf = updatedAppElement.slice(endOfPages);
      updatedAppElement = [
        appElementTopHalf,
        `'${this.preferences.pageName}',`,
        '\n        ', appElementBottomHalf
      ].join('');
    }

    // Save the app element
    this.fs.write(appElementFile, updatedAppElement);
  },

  install: function () {
    this.log(chalk.bold('\n\tPage generated!\n'));
  },

  _guessAppName: function() {
    return new Promise((resolve) => {
      resolve(this.polymerConfig.shell.replace('src/', '').replace('.html', ''));
    });
  },

  _guessAppHandle: function() {
    return new Promise((resolve) => {
      let signinFragment = this.polymerConfig.fragments.find((frament) => frament.match(/.*signin\.html/));
      resolve(signinFragment ? signinFragment.replace('src/views/', '').replace('-signin.html', '') : '');
    });
  },

  _validatePageName: function(name) {
    return new Promise((resolve) => {
      let result = nameValidator(`apphandle-${name}`);
      resolve(result.isValid || result.message)
    });
  },

  _guessTitle: function(answers) {
    return new Promise((resolve) => {
      let title = answers.pageName.replace(this.appHandle, '');
      resolve(title.charAt(0).toUpperCase() + title.slice(1));
    });
  },

  _isMenuItem: function(answers) {
    return answers.hasMenuItem;
  },

  _isSubPage: function(answers) {
    return answers.isSubPage;
  },

  _isTopLevelPage: function(answers) {
    return answers.hasMenuItem && !answers.isSubPage;
  }

});
