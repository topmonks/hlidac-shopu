# Extension hits stats script

Get information about extension hits on stores.

***You need to be logged to AWS client with your credentials.***

Navigate to root directory of the project and run for stats for current month:

```bash
$  yarn stats
```

To get hits from specific date to now, use `--from` argument.

```bash
$  yarn stats --from='2022-06'
```

Results is parsed from JSON to csv and saved as `$ date[interval]-timestamp[createdAt].csv` in `./scripts/statistics` folder.

## Example console OUTPUT
```json
[
  { name: 'shopname', hits: 12345 },
  { name: 'shopname2', hits: 1234 },
  { name: 'shopname3', hits: 123 },
  { name: 'shopname4', hits: 12 },
  { name: 'shopname5', hits: 1 }
]
```

