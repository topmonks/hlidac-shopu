//
//  ViewController.swift
//  hlidac-shopu
//
//  Created by Daniel Hromada on 09/11/2019.
//  Copyright © 2019 Daniel Hromada. All rights reserved.
//

import Cocoa
import SafariServices.SFSafariApplication
import SwiftUI


class ViewController: NSViewController {

    @IBOutlet var appNameLabel: NSTextField!
    
    override func viewDidLoad() {
        super.viewDidLoad()
    }
    
    
    @IBAction func openSafariExtensionPreferences(_ sender: AnyObject?) {
        SFSafariApplication.showPreferencesForExtension(withIdentifier: "com.topmonks.hlidac-shopu-extension") { error in
            if let _ = error {
                // Insert code to inform the user that something went wrong.

            }
        }
        
        // self.view.window?.close()
    }
    
    @IBAction func openHelpLink(_ sender: AnyObject?) {
        if let url = URL(string: "https://www.hlidacshopu.cz/") {
            SFSafariApplication.openWindow(with: url)
        }
    }
    

}
