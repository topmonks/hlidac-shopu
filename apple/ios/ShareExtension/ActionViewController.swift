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
    @IBOutlet weak var webView: WKWebView!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        getAndOpenURL()
    }
    
    private func getAndOpenURL() {
        let extensionItem = extensionContext?.inputItems.first as! NSExtensionItem
        let itemProvider = extensionItem.attachments?.first!
        
        if (itemProvider?.hasItemConformingToTypeIdentifier(String(kUTTypePropertyList)))! {
            itemProvider?.loadItem(forTypeIdentifier: String(kUTTypePropertyList), options: nil, completionHandler: { (item, error) in
                guard let dictionary = item as? NSDictionary else { return }
                if let results = dictionary[NSExtensionJavaScriptPreprocessingResultsKey] as? NSDictionary,
                   let urlString = results["URL"] as? String,
                   let url = NSURL(string: urlString) {
                    OperationQueue.main.addOperation {
                        let myURL = URL(string:"https://www.hlidacshopu.cz/share-action/?utm_source=ios-app-extension&url=\(url)")
                        let myRequest = URLRequest(url: myURL!)
                        self.webView.load(myRequest)
                    }
                }
            })
            
        } else if (itemProvider?.hasItemConformingToTypeIdentifier(String(kUTTypeText)))! {
            itemProvider?.loadItem(forTypeIdentifier: String(kUTTypeText), options: nil, completionHandler: { (result, error) in
                guard let url = result as? String else { return }
      
                OperationQueue.main.addOperation {
                    let myURL = URL(string:"https://www.hlidacshopu.cz/share-action/?utm_source=ios-app-extension&url=\(url)")
                    let myRequest = URLRequest(url: myURL!)
                    self.webView.load(myRequest)
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
