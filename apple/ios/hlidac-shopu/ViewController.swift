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

    var webView: WKWebView!
    
    override func loadView() {
        let webConfiguration = WKWebViewConfiguration()
        
        webView = WKWebView(frame: .zero, configuration: webConfiguration)
        webView.uiDelegate = self
        view = webView
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        
        let myURL = URL(string:"https://www.hlidacshopu.cz/app/")
        let myRequest = URLRequest(url: myURL!)
        webView.load(myRequest)
    }

}

