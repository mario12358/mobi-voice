# Official sherpa-onnx binaries are fetched (and checksum-verified) when CocoaPods reads this spec:
# development pods do not run prepare_command.
system('bash', File.join(__dir__, 'scripts', 'fetch-sherpa.sh'), 'ios', File.join(__dir__, 'vendor', 'ios')) ||
  raise('MobiAudio: downloading sherpa-onnx failed')

Pod::Spec.new do |s|
  s.name           = 'MobiAudio'
  s.version        = '0.1.0'
  s.summary        = 'MobiVoice microphone capture with system echo cancellation and on-device speech models'
  s.description    = 'MobiVoice microphone capture with system echo cancellation, audio interruptions, microphone permission and sherpa-onnx (Silero VAD)'
  s.license        = 'UNLICENSED'
  s.author         = 'MobiVoice'
  s.homepage       = 'https://github.com/mario12358/mobi-voice'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  # Swift only: a broader glob would pull the vendored C++ headers into the module's umbrella header.
  s.source_files = 'ios/*.swift'
  s.resources = 'assets/*.onnx'
  s.vendored_frameworks = 'vendor/ios/SherpaOnnxC.xcframework', 'vendor/ios/onnxruntime.xcframework'
  s.libraries = 'c++'
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
