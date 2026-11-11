# Generated HEVC fixture

`hevc-main10-12s.mov` is generated test-pattern video, not a user's recording.
It contains 12 seconds (288 frames at 24 fps) of HEVC Main 10, 10-bit 4:2:0,
with `hvc1` codec tag inside a QuickTime (`qt  `) container. Resolution: 160×90.
It is designed to cover the duration and codec reported for iPhone uploads,
without checking in anyone's personal video. FFmpeg generation and decoding
were verified locally. Tests check upload integrity, not device HEVC playback.

Generation with FFmpeg including libx265:

```sh
ffmpeg -f lavfi -i testsrc2=size=160x90:rate=24 -t 12 -an \
  -c:v libx265 -preset ultrafast -pix_fmt yuv420p10le -tag:v hvc1 \
  -x265-params pools=1:frame-threads=1:log-level=error \
  -movflags +faststart hevc-main10-12s.mov
```

The browser regression test pads this valid MOV with a standard `free` atom
of 17 MiB to reproduce an upload above ingress request-size limits. It also
simulates a lost chunk acknowledgement and, on desktop, a total transfer
longer than nine seconds. The simulated proxy rejects bodies over 512 KiB.
