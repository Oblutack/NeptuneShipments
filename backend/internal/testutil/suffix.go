package testutil

import (
	"fmt"
	"os"
	"sync/atomic"
	"time"
)

var suffixCounter atomic.Int64

// UniqueSuffix returns a string safe to use as a uniqueness suffix in
// test fixtures (IMO numbers, UN/LOCODEs, emails, tracking numbers).
// time.Now().UnixNano() alone collides more than it looks like it
// should: `go test ./...` runs each package as a separate OS process,
// and Windows' clock resolution is often coarse enough (commonly
// ~15.6ms) that two processes starting close together can read the
// exact same nanosecond value. Mixing in the PID and an atomic counter
// makes a same-instant, same-process, AND cross-process collision all
// equally impossible.
func UniqueSuffix() string {
	n := suffixCounter.Add(1)
	return fmt.Sprintf("%d%d%d", time.Now().UnixNano(), os.Getpid(), n)
}
