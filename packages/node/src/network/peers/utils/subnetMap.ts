export type RequestedSubnet = {
  subnet: number;
};

/**
 * Track requested subnets by `toSlot`
 */
export class SubnetMap {
  /** Map of subnets and the slot until they are needed */
  private subnets = new Map<number, boolean>();

  get size(): number {
    return this.subnets.size;
  }

  has(subnet: number): boolean {
    return this.subnets.has(subnet);
  }

  /**
   * Register requested subnets, extends toSlot if same subnet.
   **/
  request(requestedSubnet: RequestedSubnet): void {
    const { subnet } = requestedSubnet;
    this.subnets.set(subnet, true);
  }

  isActive(subnet: number): boolean {
    return !!this.subnets.get(subnet);
  }

  getActive(): number[] {
    const subnetIds: number[] = [];
    for (const [subnet, isActive] of this.subnets.entries()) {
      if (isActive) {
        subnetIds.push(subnet);
      }
    }
    return subnetIds;
  }

  getActiveTtl(): RequestedSubnet[] {
    const subnets: RequestedSubnet[] = [];
    for (const [subnet, isActive] of this.subnets.entries()) {
      if (isActive) {
        subnets.push({ subnet });
      }
    }
    return subnets;
  }

  getExpired(): number[] {
    const subnetIds: number[] = [];
    for (const [subnet, isActive] of this.subnets.entries()) {
      if (!isActive) {
        subnetIds.push(subnet);
        this.subnets.delete(subnet);
      }
    }
    return subnetIds;
  }

  getAll(): number[] {
    return Array.from(this.subnets.keys());
  }

  delete(subnet: number): void {
    this.subnets.delete(subnet);
  }
}
