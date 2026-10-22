# Contributing to Whichart

Thanks for helping. A few rules keep the reference trustworthy.

## Sign off your commits (DCO)

Every commit needs a `Signed-off-by` line certifying the [Developer Certificate of Origin](https://developercertificate.org/):

```sh
git commit -s -m "Add funnel chart"
```

No CLA is required.

## Data

Sample and edge-case data must be **synthetic**. Never commit real customer, store or employer data.

## Licensing of contributions

By contributing you agree your work is licensed as described in the README: CC0 for chart code and data, CC BY 4.0 for guides, MIT for everything else.

## Chart entries

One pull request per chart. The entry format and review checklist arrive with the `chart.yaml` schema (milestone M1, see [PLAN.md](PLAN.md)). Every entry must pass CI and be approved by a maintainer before merge.
