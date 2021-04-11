import * as core from '@actions/core'
import {exec} from '@actions/exec'

async function run(): Promise<void> {
  try {
    const buildkitImage = core.getInput('buildkitImage', {required: true})
    const context = core.getInput('context', {required: true})
    const image = core.getInput('image', {required: true})
    const tag = core.getInput('tag', {required: true})
    const additionalTags = core
      .getInput('additionalTags')
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0)
    const cacheTag = core.getInput('cacheTag', {required: true})
    const skipIfExists =
      core.getInput('skipIfExists', {required: true}) === 'true'
    const imageWithTag = `${image}:${tag}`

    core.setOutput('image', image)
    core.setOutput('tag', tag)

    if (skipIfExists) {
      try {
        await exec('docker', ['manifest', 'inspect', imageWithTag])
        core.info(
          `Image ${imageWithTag} already exists in the registry, nothing to do`
        )
        return
      } catch (e) {
        core.info(
          `Image ${imageWithTag} does not exist in the registry, going to build`
        )
      }
    }

    const home = process.env['HOME']!
    const imagesToPush = [imageWithTag].concat(
      additionalTags.map(t => `name=${image}:${t}`)
    )

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
      `type=image,"${imagesToPush.join(',')}",push=true`,
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
