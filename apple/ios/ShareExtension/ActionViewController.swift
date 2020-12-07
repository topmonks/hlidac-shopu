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
    if let item = extensionContext?.inputItems.first as? NSExtensionItem {
      for (index, _) in (item.attachments?.enumerated())! {
        let itemProvider = item.attachments?[index]
        if (itemProvider?.hasItemConformingToTypeIdentifier(String(kUTTypeURL)))! {
          itemProvider?.loadItem(forTypeIdentifier: String(kUTTypeURL), options: nil, completionHandler: {
            (result, error) in
              guard let url = result as? NSURL else { return }
              OperationQueue.main.addOperation {
                let myURL = URL(string:"https://www.hlidacshopu.cz/share-action/?utm_source=ios-app-extension&url=\(url)")
                let myRequest = URLRequest(url: myURL!)
                self.webView.load(myRequest)
              }
          })
        }
      }
    }
  }

  @IBAction func done() {
    // Return any edited content to the host app.
    // This template doesn't do anything, so we just echo the passed in items.
    self.extensionContext!.completeRequest(returningItems: self.extensionContext!.inputItems, completionHandler: nil)
  }
}
