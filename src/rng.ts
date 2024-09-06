export class RNG {
  m_w = 1234567890
  m_z = 9876543210
  mask = 0xffffffff

  constructor(seed: number) {
    this.m_w = (1234567890 + seed) & this.mask
    this.m_z = (9876543210 - seed) & this.mask
  }

  random() {
    this.m_z = (36969 * (this.m_z & 65535) + (this.m_z >> 16)) & this.mask
    this.m_w = (18000 * (this.m_w & 65535) + (this.m_w >> 16)) & this.mask
    let result = ((this.m_z << 16) + (this.m_w & 65535)) >>> 0
    result /= 4294967296
    return result
  }
}
