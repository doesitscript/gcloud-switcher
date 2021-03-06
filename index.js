#!/usr/bin/env node

const yaml        = require('js-yaml')
const fs          = require('fs')
const chalk       = require('chalk');
const clear       = require('clear');
const CLI         = require('clui');
const figlet      = require('figlet');
const inquirer    = require('inquirer');
const Preferences = require('preferences');
const Spinner     = CLI.Spinner;
const _           = require('lodash')
const shell       = require('shelljs')
const program = require('commander')

const showHelp = () => {
  console.log(chalk.yellow('test'))
  return
}

program
  .version('0.0.1')
  .option('-h, --help', 'Display help', showHelp)
  .parse(process.argv);

clear()

console.log(
  chalk.green(figlet.textSync('Google Cloud Switcher', {
    font: 'Thin',
    horizontalLayout: 'default',
    verticalLayout: 'default'
  }))
)

const loadConfig = (file = 'conf.yaml') => {
  return new Promise((resolve, _) => {
    const entries = yaml.safeLoad(fs.readFileSync(file, 'utf8'))
    resolve(entries)
  })
}

const findConfigEntry = (name, configs) => configs.find(config => config.name === name)

/**
 * Gcloud
 */
function Gcloud() {}

/**
 * switch
 *
 * @param {Object} config
 */
Gcloud.prototype.switch = config => {
  return new Promise((resolve, reject) => {
    console.log(chalk.green('Login'))
    shell.exec('gcloud auth login')

    console.log(chalk.green(`Setting region to ${config.region}`))
    shell.exec(`gcloud config set compute/zone ${config.region}`)

    console.log(chalk.green(`Setting project to ${config.project}`))
    shell.exec(`gcloud config set project ${config.project}`)

    console.log(chalk.green(`Fetching cluster credentials for cluster: ${config.cluster}`))
    shell.exec(`gcloud beta container clusters get-credentials ${config.cluster}`)

    resolve(true)
  })
}

/**
 * getProject
 *
 * @param {Function} callback
 */
const getProject = callback => {
  const gcloud = new Gcloud()
  const argv = require('minimist')(process.argv.slice(2))

  inquirer.prompt({
    name: 'configPath',
    type: 'input',
    default: 'conf.yaml',
    message: 'Enter a file name for your conf.yaml',
    validate: value => {
      if (value.length) {
        return true
      }

      return 'Please enter a valid file path'
    },
  }).then(answers => {
    return loadConfig(answers.configPath).then(configs => {
      const configNames = configs.map(conf => conf.name)
      return inquirer.prompt({
        name: 'config',
        type: 'list',
        choices: [...configNames],
        message: 'Enter your Google Cloud Project name',
        validate: value => {
          if (value.length) {
            return true
          }
          return 'Please enter a valid project name'
        }
      }).then(answers => {
        return { configName: answers.config, configs }
      })
    })
  })
  .then(({ configName, configs }) => {
    const status = new Spinner('Switching...')
    status.start()
    const config = findConfigEntry(configName, configs)
    gcloud.switch(config).then(res => {
      status.stop()
      callback()
    }).catch(e => {
      status.stop()
      const err = new Error('Failed to switch projects')
      printError(err.message)
    }).catch(e => {
      status.stop()
      const err = new Error('Failed to load config file')
      printError(err.message)
    })
  })
}

/**
 * getProject
 */
getProject(() => {
  console.log(
    chalk.green(figlet.textSync('Done!', {
      font: 'Thin',
      horizontalLayout: 'default',
      verticalLayout: 'default'
    }))
  )
})

const printError = e => {
  console.log(chalk.red(e))
}
