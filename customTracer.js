function tracer() {
  return {
    addrs: ['0xffffffffffffffffffffffffffffffffffffffff'],
    output: {
      '0xffffffffffffffffffffffffffffffffffffffff': {
        storage: {},
        number: 0,
        violation: {}
      }
    },
    prevOp: { op: '', data: '' },
    calls: [],
    numberCounter: 0,

    fault: function fault(log, db) {},

    result: function result(ctx, db) {
      return {
        trace: this.output,
        calls: this.calls
      };
    },

    step: function step(log, db) {
      var opcode = log.op.toString();

      if (log.getGas() < log.getCost()) { }

      if (this.prevOp.op == 'KECCAK256') {
        this.pKeccakAfter(log);
      }

      if (
        opcode.match(/^(EXT.*|CALL|CALLCODE|DELEGATECALL|STATICCALL|CREATE2)$/) !=
        null
      ) {
        var idx = opcode.startsWith("EXT") ? 0 : 1;
        var addr = toAddress(log.stack.peek(idx).toString(16));
        var hex = toHex(addr);
        if (this.output[hex] && this.output[hex].contractSize == null) {
          this.output[hex].contractSize = db.getCode(addr).length;
        }
      }

      if (log.getDepth() > 1) {
        if (this.prevOp.op === 'GAS' && !opcode.includes('CALL')) {
          const to = this.addrs[log.getDepth() - 1];
          if (!this.output[to].violation) {
            this.output[to].violation = {};
          }
          this.output[to].violation['GAS'] = true;
        }
      }

      this.prevOp.op = opcode;
      switch (opcode) {
        case 'SLOAD':
        case 'SSTORE':
          this.pSloadStore(log);
          break;
        case 'REVERT':
        case 'RETURN':
          if (log.getDepth() == 1) {
            var ofs = parseInt(log.stack.peek(0).toString());
            var len = parseInt(log.stack.peek(1).toString());
            var data = toHex(log.memory.slice(ofs, ofs + len)).slice(0, 1000);
            this.calls.push({
              type: opcode,
              gasUsed: 0,
              data: data,
            });
            this.addrs.pop();
          }
          break;
        case 'KECCAK256':
          this.pKeccak(log);
          break;
        case 'NUMBER':
          if (log.getDepth() == 1) {
            this.numberCounter += 1;
            break;
          }
        case 'GASPRICE':
        case 'GASLIMIT':
        case 'DIFFICULTY':
        case 'TIMESTAMP':
        case 'BASEFEE':
        case 'BLOCKHASH':
        case 'NUMBER':
        case 'SELFBALANCE':
        case 'BALANCE':
        case 'ORIGIN':
        case 'COINBASE':
        case 'SELFDESTRUCT':
        case 'CREATE':
        case 'CREATE2': {
          const to = this.addrs[log.getDepth() - 1];
          if (!this.output[to].violation[opcode]) {
            this.output[to].violation[opcode] = 0;
          }
          this.output[to].violation[opcode] += 1;
          break;
        }
        default:
          break;
      }
    },

    pSloadStore: function(log) {
      var key = log.stack.peek(0).toString(16);
      var to = this.addrs[log.getDepth() - 1];
      if (!this.output[to].storage[key]) {
        this.output[to].storage[key] = 0;
      }
      this.output[to].storage[key] += 1;
    },

    pKeccak: function(log) {
      var _ofs = log.stack.peek(0);
      var _len = log.stack.peek(1);
      this.prevOp.data = toHex(log.memory.slice(_ofs, _ofs + _len));
    },

    pKeccakAfter: function(log) {
      var input = this.prevOp.data;
      var hash = log.stack.peek(0).toString(16);
      var to = this.addrs[log.getDepth() - 1];
      this.prevOp.op = '';
      if (!this.output[to].keccak) {
        this.output[to].keccak = {};
      }
      this.output[to].keccak[input] = hash;
    },

    enter: function enter(frame) {
      var to = toHex(frame.getTo());
      this.calls.push({
        type: frame.getType(),
        from: toHex(frame.getFrom()),
        to: to,
        method: toHex(frame.getInput()).slice(0, 10),
        gas: frame.getGas(),
        value: frame.getValue(),
      });
      this.addrs.push(to);
      this.initStorage(to);
    },

    exit: function exit(frame) {
      this.calls.push({
        type: frame.getError() != null ? "REVERT" : "RETURN",
        gasUsed: frame.getGasUsed(),
        data: toHex(frame.getOutput()).slice(0, 1000),
      });
      this.addrs.pop();
    },

    initStorage: function(to) {
      if (!this.output[to]) {
        this.output[to] = { storage: {}, number: this.numberCounter, violation: {} };
      }
    },
  }
}