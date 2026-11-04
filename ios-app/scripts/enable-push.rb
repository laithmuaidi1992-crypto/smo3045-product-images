# Push notifications: entitlements file + build setting, and the AppDelegate hooks Capacitor needs.
require 'xcodeproj'
require 'fileutils'
root = File.expand_path('..', __dir__)
FileUtils.cp(File.join(root, 'App.entitlements'), File.join(root, 'ios/App/App/App.entitlements'))
proj = Xcodeproj::Project.open(File.join(root, 'ios/App/App.xcodeproj'))
target = proj.targets.find { |t| t.name == 'App' }
group = proj.main_group['App'] || proj.main_group
group.files.find { |f| f.path == 'App.entitlements' } || group.new_file('App.entitlements')
target.build_configurations.each { |c| c.build_settings['CODE_SIGN_ENTITLEMENTS'] = 'App/App.entitlements' }
proj.save

ad = File.join(root, 'ios/App/App/AppDelegate.swift')
src = File.read(ad)
unless src.include?('capacitorDidRegisterForRemoteNotifications')
  hooks = <<~SWIFT

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }
  SWIFT
  i = src.rindex('}')  # end of the AppDelegate class
  src = src[0...i] + hooks.gsub(/^/, '    ') + "}\n"
  File.write(ad, src)
end
puts 'push enabled: entitlements + AppDelegate hooks'
