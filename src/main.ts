import * as core from '@actions/core'
import {exec} from '@actions/exec'

async function run(): Promise<void> {
  try {
    const buildkitImage = core.getInput('buildkitImage')
    const context = core.getInput('context')
    const image = core.getInput('image')
    const tag = core.getInput('tag')
    const cacheTag = core.getInput('cacheTag')

    const home = process.env['HOME']!
    const imageWithTag = `${image}:${tag}`

    await exec('docker', [
      'run',
      '--workdir',
      '/context',
      '--rm',
      '--security-opt',
      'seccomp=unconfined',
      '--security-opt',
      'apparmor=unconfined',
      '-e',
      'BUILDKITD_FLAGS=--oci-worker-no-process-sandbox',
      '--entrypoint',
      'buildctl-daemonless.sh',
      '-v',
      `${context}:/context`,
      '-v',
      `${home}/.docker/config.json:/home/user/.docker/config.json`,
      buildkitImage,
      'build',
      '--frontend',
      'dockerfile.v0',
      '--local',
      'context=/context',
      '--local',
      'dockerfile=/context',
      '--output',
      `type=image,name=${imageWithTag},push=true`,
      '--export-cache',
      `type=registry,ref=${image}:${cacheTag}`,
      '--import-cache',
      `type=registry,ref=${image}:${cacheTag}`
    ])
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
