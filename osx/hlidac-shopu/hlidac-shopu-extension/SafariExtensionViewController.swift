//
//  SafariExtensionViewController.swift
//  hlidac-shopu Extension
//
//  Created by Daniel Hromada on 09/11/2019.
//  Copyright © 2019 Daniel Hromada. All rights reserved.
//

import SafariServices

class SafariExtensionViewController: SFSafariExtensionViewController {
    
    static let shared: SafariExtensionViewController = {
        let shared = SafariExtensionViewController()
        shared.preferredContentSize = NSSize(width:320, height:240)
        return shared
    }()

}
