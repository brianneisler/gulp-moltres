import _ from 'mudash'
import ignore from 'ignore'
import { obj } from 'through2'
import { File, log, PluginError } from 'gulp-util'
import { Observable } from 'rx-lite'
import { basename, dirname, extname, relative, resolve, sep } from 'path'

const { range, timer, just, fromNodeCallback } = Observable
const { pow } = Math
const { parse, stringify } = JSON

const PLUGIN_NAME = 'gulp-moltres'

function install(options) {
  const ignorer = options.ignore ? ignore().add(options.ignore) : null
  let moduleMap = {}
  let targets = {}
  function doScan(file, enc, done) {
    if (file.isNull() || file.moltres) {
      this.push(file)
      return done()
    }

    if (file.isStream()) {
      return done(new PluginError(PLUGIN_NAME, 'Streaming not supported'))
    }

    try {
      const fileType = extname(file.path)
      if (fileType === '.json') {
        scanJson(file)
      }
    } catch (err) {
      console.log('err:', err, ' file.path:', file.path)
      this.emit('error', new PluginError(PLUGIN_NAME, err, {
        fileName: file.path,
        showProperties: false
      }))
    }

    done()
  }

  function doInstall(done) {
    try {
      console.log('moduleMap:', moduleMap)
      console.log('targets:', targets)
      _.each(targets, (target) => {
        installMoltres(target, this)
      })
      return done()
    } catch (error) {
      return done(new PluginError(PLUGIN_NAME, error))
    }
  }


  function installMoltres(target, stream) {
    let installedModules = {}
    const { data } = target
    if (data.dependencies) {
      installDependencies(data.dependencies)
    }
    console.log('installedModules:', installedModules)
    _.each(installedModules, (installedModule) => {
      const { data: { name, type } } = installedModule
      const installedPath = dirname(installedModule.path)
      const targetPath = dirname(target.path)
      const modulePath = resolve(targetPath, `node_modules/${type}/${name}`)
      const moduleContents = buildModuleContents(installedPath, modulePath)
      const moduleFile = new File({
        cwd: installedModule.cwd,
        base: installedModule.base,
        path: resolve(modulePath, 'index.js'),
        contents: new Buffer(moduleContents),
        stat: {
          isFile: function () { return true; },
          isDirectory: function () { return false; },
          isBlockDevice: function () { return false; },
          isCharacterDevice: function () { return false; },
          isSymbolicLink: function () { return false; },
          isFIFO: function () { return false; },
          isSocket: function () { return false; }
        }
      });
      stream.push(moduleFile)
    })

    function installDependencies(dependencies) {
      _.each(dependencies, (depSet, type) => {
        if (type !== 'npm') { //hack, add this functionality later
          _.each(depSet, (version, name) => {
            installModule('moltres', type, name)
          })
        }
      })
    }

    function installModule(namespace, type, name) {
      if (!_.has(installedModules, moduleKey(namespace, type, name))) {
        const module = _.get(moduleMap, modulePath(namespace, type, name))
        if (module) {
          installedModules = _.assoc(installedModules, {
            [moduleKey(namespace, type, name)]: module
          })
          installDependencies(module.data.dependencies)
        } else {
          throw new Error(`Cannot find module ${type}:${name}`)
        }
      }
    }
  }

  function scanJson(file) {
    try {
      const fileContent = file.contents.toString()
      const fileName = basename(file.path)
      const data = parse(fileContent)
      const module = _.assoc({ data }, {
        path: unixStylePath(file.path),
        cwd: unixStylePath(file.cwd),
        base: unixStylePath(file.base)
      })
      if (fileName === 'moltres.json') {
        if (!_.isEmpty(ignorer.filter([file.path]))) {
          targets = _.assoc(targets, {
            [file.path.replace('.', ':')]: module
          })
        }
      } else {
        const { namespace, type, name } = data
        if (namespace === 'moltres') {
          file.moltres = module
          moduleMap = _.assoc(moduleMap, {
            [modulePath(namespace, type, name)]: module
          })
        }
      }
    } catch(error) {
      //console.log('error:', error)
    }
  }

  return obj(doScan, doInstall)
}

function buildModuleContents(installedPath, modulePath) {
  return `module.exports = require('${relative(modulePath, installedPath)}')`
}

function unixStylePath(filePath) {
  return filePath.split(sep).join('/');
}

function moduleKey(namespace, type, name) {
  return `${namespace}:${type}:${name}`
}

function modulePath(namespace, type, name) {
  return `${namespace}.${type}.${name}`
}

export default {
  install
}
