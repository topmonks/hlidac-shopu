# Extension hits stats script

Get information about extension hits on stores.

***You need to be logged to AWS client with your credentials.***

Navigate to root directory of the project and run for stats from beginning:

```bash
$  yarn stats
```

To get hits from specific date to now, use `--from` argument.

```bash
$  yarn stats --from='2022-06'
```

Results is saved to file as JSON in pretty-print  `$ date[interval]-timestamp[createdAt].json` to `./scripts/statistics`
folder.

## Example console OUTPUT

```json
{
  "2022-09": [
    {
      "name": "shopname",
      "hits": 12345
    },
    {
      "name": "shopname2",
      "hits": 1234
    },
    {
      "name": "shopname2",
      "hits": 123
    }
  ],
  "2022-10": [
    {
      "name": "shopname",
      "hits": 12345
    },
    {
      "name": "shopname2",
      "hits": 1234
    },
    {
      "name": "shopname2",
      "hits": 123
    }
  ]
}
```

