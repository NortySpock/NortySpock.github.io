Uses [Makesite](https://github.com/sunainapai/makesite) to generate NortySpock's personal blog.

### building
1. `uv add --dev commonmark`
2. `uv run makesite.py`

### continous building, serves the code, opens new tab when built or rebuilt
`uv run makesite.py --serve --monitor-for-changes --open`

### serving the built webpage, locally, the original way:
`python3 -m http.server 4000 --directory docs/`
