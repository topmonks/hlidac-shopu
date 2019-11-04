zip:
	zip extension.zip "manifest.json" `cat manifest.json | jq -r '.content_scripts[0].js[]'` `cat manifest.json | jq -r '.icons[]'`

clean:
	rm -f extension.zip
