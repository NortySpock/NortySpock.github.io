Uses [Makesite](https://github.com/sunainapai/makesite) to generate NortySpock's personal blog.

### building
1. `uv add --dev commonmark`
2. `uv run makesite.py`

### continous building, opens new tab when built
`uv run makesite.py --monitor-for-changes --open`

### serving built webpage locally
`python3 -m http.server 4000 --directory docs/`
