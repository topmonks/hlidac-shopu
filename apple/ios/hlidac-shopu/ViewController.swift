//
//  ViewController.swift
//  hlidac-shopu
//
//  Created by Daniel Hromada on 04/12/2019.
//  Copyright © 2019 TopMonks. All rights reserved.
//

import UIKit
import WebKit


class ViewController: UIViewController, WKUIDelegate {

    @IBOutlet weak var webView: WKWebView!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        let link = URL(string:"https://www.hlidacshopu.cz/app/?utm_source=ios-app")
        let request = URLRequest(url: link!)
        
        self.webView.load(request)
    }

}

