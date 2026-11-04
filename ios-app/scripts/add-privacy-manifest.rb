# Copies PrivacyInfo.xcprivacy into the app target and makes sure it is in "Copy Bundle Resources".
require 'xcodeproj'
require 'fileutils'
root = File.expand_path('..', __dir__)
dest = File.join(root, 'ios/App/App/PrivacyInfo.xcprivacy')
FileUtils.cp(File.join(root, 'PrivacyInfo.xcprivacy'), dest)
proj = Xcodeproj::Project.open(File.join(root, 'ios/App/App.xcodeproj'))
target = proj.targets.find { |t| t.name == 'App' }
already = target.resources_build_phase.files_references.any? { |f| f && f.path && f.path.end_with?('PrivacyInfo.xcprivacy') }
unless already
  group = proj.main_group['App'] || proj.main_group
  ref = group.files.find { |f| f.path == 'PrivacyInfo.xcprivacy' } || group.new_file('PrivacyInfo.xcprivacy')
  target.resources_build_phase.add_file_reference(ref, true)
  proj.save
end
puts "privacy manifest #{already ? 'replaced' : 'added'}"
