function bundlerCollectorTracer() {
  return {
    callsFromEntryPoint: [],
    currentLevel: null,
    keccak: [],
    calls: [],
    logs: [],
    debug: [],
    lastOp: '',
    stopCollectingTopic: 'bb47ee3e183a558b1a2ff0874b079f3fc5478b7454eacf2bfc5af2ff5878f972',
    stopCollecting: false,
    topLevelCallCounter: 0,
    fault: function fault(log, db) {
      this.debug.push('fault depth=', log.getDepth(), ' gas=', log.getGas(), ' cost=', log.getCost(), ' err=', log.getError());
    },
    result: function result(ctx, db) {
      return {
        callsFromEntryPoint: this.callsFromEntryPoint,
        keccak: this.keccak,
        logs: this.logs,
        calls: this.calls,
        debug: this.debug,
      };
    },
    enter: function enter(frame) {
      if (this.stopCollecting) {
        return;
      }
      this.calls.push({
        type: frame.getType(),
        from: toHex(frame.getFrom()),
        to: toHex(frame.getTo()),
        method: toHex(frame.getInput()).slice(0, 10),
        gas: frame.getGas(),
        value: frame.getValue(),
      });
    },
    exit: function exit(frame) {
      if (this.stopCollecting) {
        return;
      }
      this.calls.push({
        type: frame.getError() != null ? 'REVERT' : 'RETURN',
        gasUsed: frame.getGasUsed(),
        data: toHex(frame.getOutput()).slice(0, 4000),
      });
    },
    countSlot: function countSlot(list, key) {
      var _a;
      list[key] = ((_a = list[key]) !== null && _a !== void 0 ? _a : 0) + 1;
    },
    step: function step(log, db) {
      var _a;
      if (this.stopCollecting) {
        return;
      }
      var opcode = log.op.toString();
      if (log.getGas() < log.getCost()) {
        this.currentLevel.oog = true;
      }
      if (opcode === 'REVERT' || opcode === 'RETURN') {
        if (log.getDepth() === 1) {
          var ofs = parseInt(log.stack.peek(0).toString());
          var len = parseInt(log.stack.peek(1).toString());
          var data = toHex(log.memory.slice(ofs, ofs + len)).slice(0, 4000);
          this.calls.push({
            type: opcode,
            gasUsed: 0,
            data: data,
          });
        }
      }
      if (log.getDepth() === 1) {
        if (opcode === 'CALL' || opcode === 'STATICCALL') {
          var addr = toAddress(log.stack.peek(1).toString(16));
          var topLevelTargetAddress = toHex(addr);
          var ofs = parseInt(log.stack.peek(3).toString());
          var topLevelMethodSig = toHex(log.memory.slice(ofs, ofs + 4));
          this.currentLevel = this.callsFromEntryPoint[
            this.topLevelCallCounter
          ] = {
            topLevelMethodSig: topLevelMethodSig,
            topLevelTargetAddress: topLevelTargetAddress,
            access: {},
            opcodes: {},
            contractSize: {},
          };
          this.topLevelCallCounter++;
        } else if (opcode === 'LOG1') {
          var topic = log.stack.peek(2).toString(16);
          if (topic === this.stopCollectingTopic) {
            this.stopCollecting = true;
          }
        }
        this.lastOp = '';
        return;
      }
      if (opcode.match(/^(EXT.*|CALL|CALLCODE|DELEGATECALL|STATICCALL)$/) != null) {
        var idx = opcode.startsWith('EXT') ? 0 : 1;
        var addr = toAddress(log.stack.peek(idx).toString(16));
        var addrHex = toHex(addr);
        if (((_a = this.currentLevel.contractSize[addrHex]) !== null && _a !== void 0 ? _a : 0) === 0 && !isPrecompiled(addr)) {
          this.currentLevel.contractSize[addrHex] = db.getCode(addr).length;
        }
      }
      if (this.lastOp === 'GAS' && !opcode.includes('CALL')) {
        this.countSlot(this.currentLevel.opcodes, 'GAS');
      }
      if (opcode !== 'GAS') {
        if (
          opcode.match(/^(DUP\d+|PUSH\d+|SWAP\d+|POP|ADD|SUB|MUL|DIV|EQ|LTE?|S?GTE?|SLT|SH[LR]|AND|OR|NOT|ISZERO)$/) == null
        ) {
          this.countSlot(this.currentLevel.opcodes, opcode);
        }
      }
      this.lastOp = opcode;
      if (opcode === 'SLOAD' || opcode === 'SSTORE') {
        var slot = toWord(log.stack.peek(0).toString(16));
        var slotHex = toHex(slot);
        var addr = log.contract.getAddress();
        var addrHex = toHex(addr);
        var access = this.currentLevel.access[addrHex];
        if (access == null) {
          access = {
            reads: {},
            writes: {},
          };
          this.currentLevel.access[addrHex] = access;
        }
        if (opcode === 'SLOAD') {
          if (access.reads[slotHex] == null && access.writes[slotHex] == null) {
            access.reads[slotHex] = toHex(db.getState(addr, slot));
          }
        } else {
          this.countSlot(access.writes, slotHex);
        }
      }
      if (opcode === 'KECCAK256') {
        var ofs = parseInt(log.stack.peek(0).toString());
        var len = parseInt(log.stack.peek(1).toString());
        if (len > 20 && len < 512) {
          this.keccak.push(toHex(log.memory.slice(ofs, ofs + len)));
        }
      } else if (opcode.startsWith('LOG')) {
        var count = parseInt(opcode.substring(3));
        var ofs = parseInt(log.stack.peek(0).toString());
        var len = parseInt(log.stack.peek(1).toString());
        var topics = [];
        for (var i = 0; i < count; i++) {
          topics.push('0x' + log.stack.peek(2 + i).toString(16));
        }
        var data = toHex(log.memory.slice(ofs, ofs + len));
        this.logs.push({
          topics: topics,
          data: data,
        });
      }
    },
  };
}
