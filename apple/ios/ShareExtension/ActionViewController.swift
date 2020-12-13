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
    guard let attachments = (extensionContext?.inputItems.first as? NSExtensionItem)?.attachments else { return }
    
    for itemProvider in attachments where itemProvider.hasItemConformingToTypeIdentifier(String(kUTTypeURL)) {
      itemProvider.loadItem(forTypeIdentifier: String(kUTTypeURL), options: nil) { result, _ in
        guard
          let urlString = result as? NSURL,
          var url = URLComponents(string: "https://www.hlidacshopu.cz/share-action/")
        else { return }
        url.queryItems = [
          URLQueryItem(name: "utm_source", value: "ios-app-extension"),
          URLQueryItem(name: "url", value: urlString.absoluteString)
        ]
        DispatchQueue.main.async {
          self.webView.load(URLRequest(url: url.url!))
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
