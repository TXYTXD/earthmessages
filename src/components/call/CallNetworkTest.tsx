import { useState } from "react";
import { Stethoscope, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { fetchIceServers } from "@/hooks/useWebRTC";

interface TestResult {
  direct: boolean;
  internet: boolean;
  relay: boolean;
}

// Probe the same ICE servers calls use and report which kinds of network
// paths this device can obtain. "relay" is the one that matters for calls
// between different networks — if it's missing, those calls cannot work.
async function probeNetwork(timeoutMs = 9000): Promise<TestResult> {
  const iceServers = await fetchIceServers();
  return new Promise((resolve) => {
    const found: TestResult = { direct: false, internet: false, relay: false };
    let pc: RTCPeerConnection | null = null;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try {
        pc?.close();
      } catch {
        /* ignore */
      }
      resolve({ ...found });
    };
    const timer = setTimeout(finish, timeoutMs);
    try {
      pc = new RTCPeerConnection({ iceServers });
      pc.createDataChannel("probe");
      pc.onicecandidate = (e) => {
        if (!e.candidate) {
          finish(); // gathering complete
          return;
        }
        const c = e.candidate.candidate || "";
        if (c.includes(" typ host")) found.direct = true;
        if (c.includes(" typ srflx")) found.internet = true;
        if (c.includes(" typ relay")) {
          found.relay = true;
          finish(); // we have everything we need
        }
      };
      pc.createOffer()
        .then((offer) => pc!.setLocalDescription(offer))
        .catch(finish);
    } catch {
      finish();
    }
  });
}

function ResultRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <div className="flex items-start gap-2.5">
      {ok ? (
        <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" />
      ) : (
        <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
      )}
      <div>
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="text-[12px] text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

export function CallNetworkTest() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResult | null>(null);

  const run = async () => {
    setTesting(true);
    setResult(null);
    const r = await probeNetwork();
    setResult(r);
    setTesting(false);
  };

  return (
    <div className="rounded-2xl border border-border p-4 mb-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Call connection test</p>
            <p className="text-[12px] text-muted-foreground">Checks if calls can work from this device</p>
          </div>
        </div>
        <button
          onClick={run}
          disabled={testing}
          className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center gap-2 flex-shrink-0"
        >
          {testing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {testing ? "Testing…" : "Test"}
        </button>
      </div>

      {result && (
        <div className="mt-4 space-y-2.5">
          <ResultRow
            ok={result.direct}
            label="Local network"
            detail="Needed for calls on the same WiFi"
          />
          <ResultRow
            ok={result.internet}
            label="Internet path"
            detail="Helps devices find each other across the internet"
          />
          <ResultRow
            ok={result.relay}
            label="Relay server"
            detail="Required for calls between different networks (e.g. WiFi ↔ mobile data)"
          />
          {!result.relay && (
            <p className="text-[12px] text-orange-500 bg-orange-500/10 rounded-lg px-3 py-2">
              The relay servers are unreachable right now. Calls will likely only work when
              both people are on the same WiFi. Show this result to support.
            </p>
          )}
          {result.relay && (
            <p className="text-[12px] text-success bg-success/10 rounded-lg px-3 py-2">
              All paths available — calls should work from this device. Ask the other person
              to run this test too.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
