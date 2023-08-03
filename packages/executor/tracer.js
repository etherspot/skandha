function tracer() {
  return {
    callsFromEntryPoint: [],
    currentLevel: null,
    keccak: [],
    calls: [],
    logs: [],
    debug: [],
    lastOp: "",
    // event sent after all validations are done: keccak("BeforeExecution()")
    stopCollectingTopic:
      "bb47ee3e183a558b1a2ff0874b079f3fc5478b7454eacf2bfc5af2ff5878f972",
    stopCollecting: false,
    topLevelCallCounter: 0,
    fault(log, db) {
      this.debug.push(
        "fault depth=",
        log.getDepth(),
        " gas=",
        log.getGas(),
        " cost=",
        log.getCost(),
        " err=",
        log.getError()
      );
    },
    result(ctx, db) {
      return {
        callsFromEntryPoint: this.callsFromEntryPoint,
        keccak: this.keccak,
        logs: this.logs,
        calls: this.calls,
        debug: this.debug, // for internal debugging.
      };
    },
    enter(frame) {
      if (this.stopCollecting) {
        return;
      }
      // this.debug.push('enter gas=', frame.getGas(), ' type=', frame.getType(), ' to=', toHex(frame.getTo()), ' in=', toHex(frame.getInput()).slice(0, 500))
      this.calls.push({
        type: frame.getType(),
        from: toHex(frame.getFrom()),
        to: toHex(frame.getTo()),
        method: toHex(frame.getInput()).slice(0, 10),
        gas: frame.getGas(),
        value: frame.getValue(),
      });
    },
    exit(frame) {
      if (this.stopCollecting) {
        return;
      }
      this.calls.push({
        type: frame.getError() != null ? "REVERT" : "RETURN",
        gasUsed: frame.getGasUsed(),
        data: toHex(frame.getOutput()).slice(0, 4000),
      });
    },
    // increment the "key" in the list. if the key is not defined yet, then set it to "1"
    countSlot(list, key) {
      let _a;
      list[key] = ((_a = list[key]) !== null && _a !== void 0 ? _a : 0) + 1;
    },
    step(log, db) {
      let _a;
      if (this.stopCollecting) {
        return;
      }
      const opcode = log.op.toString();
      // this.debug.push(this.lastOp + '-' + opcode + '-' + log.getDepth() + '-' + log.getGas() + '-' + log.getCost())
      if (log.getGas() < log.getCost()) {
        this.currentLevel.oog = true;
      }
      if (opcode === "REVERT" || opcode === "RETURN") {
        if (log.getDepth() === 1) {
          // exit() is not called on top-level return/revent, so we reconstruct it
          // from opcode
          const ofs = parseInt(log.stack.peek(0).toString());
          const len = parseInt(log.stack.peek(1).toString());
          const data = toHex(log.memory.slice(ofs, ofs + len)).slice(0, 4000);
          // this.debug.push(opcode + ' ' + data)
          this.calls.push({
            type: opcode,
            gasUsed: 0,
            data,
          });
        }
      }
      if (log.getDepth() === 1) {
        if (opcode === "CALL" || opcode === "STATICCALL") {
          // stack.peek(0) - gas
          const addr = toAddress(log.stack.peek(1).toString(16));
          const topLevelTargetAddress = toHex(addr);
          // stack.peek(2) - value
          const ofs = parseInt(log.stack.peek(3).toString());
          // stack.peek(4) - len
          const topLevelMethodSig = toHex(log.memory.slice(ofs, ofs + 4));
          this.currentLevel = this.callsFromEntryPoint[
            this.topLevelCallCounter
          ] = {
            topLevelMethodSig,
            topLevelTargetAddress,
            access: {},
            opcodes: {},
            contractSize: {},
          };
          this.topLevelCallCounter++;
        } else if (opcode === "LOG1") {
          // ignore log data ofs, len
          const topic = log.stack.peek(2).toString(16);
          if (topic === this.stopCollectingTopic) {
            this.stopCollecting = true;
          }
        }
        this.lastOp = "";
        return;
      }
      if (
        opcode.match(/^(EXT.*|CALL|CALLCODE|DELEGATECALL|STATICCALL)$/) != null
      ) {
        // this.debug.push('op=' + opcode + ' last=' + this.lastOp + ' stacksize=' + log.stack.length())
        const idx = opcode.startsWith("EXT") ? 0 : 1;
        const addr = toAddress(log.stack.peek(idx).toString(16));
        const addrHex = toHex(addr);
        if (
          ((_a = this.currentLevel.contractSize[addrHex]) !== null &&
          _a !== void 0
            ? _a
            : 0) === 0 &&
          !isPrecompiled(addr)
        ) {
          this.currentLevel.contractSize[addrHex] = db.getCode(addr).length;
        }
      }
      if (this.lastOp === "GAS" && !opcode.includes("CALL")) {
        // count "GAS" opcode only if not followed by "CALL"
        this.countSlot(this.currentLevel.opcodes, "GAS");
      }
      if (opcode !== "GAS") {
        // ignore "unimportant" opcodes:
        if (
          opcode.match(
            /^(DUP\d+|PUSH\d+|SWAP\d+|POP|ADD|SUB|MUL|DIV|EQ|LTE?|S?GTE?|SLT|SH[LR]|AND|OR|NOT|ISZERO)$/
          ) == null
        ) {
          this.countSlot(this.currentLevel.opcodes, opcode);
        }
      }
      this.lastOp = opcode;
      if (opcode === "SLOAD" || opcode === "SSTORE") {
        const slot = toWord(log.stack.peek(0).toString(16));
        const slotHex = toHex(slot);
        const addr = log.contract.getAddress();
        const addrHex = toHex(addr);
        let access = this.currentLevel.access[addrHex];
        if (access == null) {
          access = {
            reads: {},
            writes: {},
          };
          this.currentLevel.access[addrHex] = access;
        }
        if (opcode === "SLOAD") {
          // read slot values before this UserOp was created
          // (so saving it if it was written before the first read)
          if (access.reads[slotHex] == null && access.writes[slotHex] == null) {
            access.reads[slotHex] = toHex(db.getState(addr, slot));
          }
        } else {
          this.countSlot(access.writes, slotHex);
        }
      }
      if (opcode === "KECCAK256") {
        // collect keccak on 64-byte blocks
        const ofs = parseInt(log.stack.peek(0).toString());
        const len = parseInt(log.stack.peek(1).toString());
        // currently, solidity uses only 2-word (6-byte) for a key. this might change..
        // still, no need to return too much
        if (len > 20 && len < 512) {
          // if (len === 64) {
          this.keccak.push(toHex(log.memory.slice(ofs, ofs + len)));
        }
      } else if (opcode.startsWith("LOG")) {
        const count = parseInt(opcode.substring(3));
        const ofs = parseInt(log.stack.peek(0).toString());
        const len = parseInt(log.stack.peek(1).toString());
        const topics = [];
        for (let i = 0; i < count; i++) {
          // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
          topics.push("0x" + log.stack.peek(2 + i).toString(16));
        }
        const data = toHex(log.memory.slice(ofs, ofs + len));
        this.logs.push({
          topics,
          data,
        });
      }
    },
  };
}
