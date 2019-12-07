//
//  ActionViewController.swift
//  ShareExtension
//
//  Created by Daniel Hromada on 07/12/2019.
//  Copyright © 2019 TopMonks. All rights reserved.
//

import UIKit
import WebKit
import MobileCoreServices

class ActionViewController: UIViewController {
    private var url: NSURL?
    
    @IBOutlet weak var webView: WKWebView!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        getAndUseURL()
    }
    
    private func getAndUseURL() {
        let extensionItem = extensionContext?.inputItems.first as! NSExtensionItem
        let itemProvider = extensionItem.attachments?.first!
        let propertyList = String(kUTTypePropertyList)
        if (itemProvider?.hasItemConformingToTypeIdentifier(propertyList))! {
            itemProvider?.loadItem(forTypeIdentifier: propertyList, options: nil, completionHandler: { (item, error) -> Void in
                guard let dictionary = item as? NSDictionary else { return }
                OperationQueue.main.addOperation {
                    if let results = dictionary[NSExtensionJavaScriptPreprocessingResultsKey] as? NSDictionary,
                        let urlString = results["URL"] as? String,
                        let url = NSURL(string: urlString) {
                        self.url = url
                        
                        // Use gained URL
                        let myURL = URL(string:"https://www.hlidacshopu.cz/app/?url=\(url)")
                        let myRequest = URLRequest(url: myURL!)
                        self.webView.load(myRequest)
                    }
                }
            })
            
        } else {
            print("nah, error")
        }
    }

    @IBAction func done() {
        // Return any edited content to the host app.
        // This template doesn't do anything, so we just echo the passed in items.
        self.extensionContext!.completeRequest(returningItems: self.extensionContext!.inputItems, completionHandler: nil)
    }

}
