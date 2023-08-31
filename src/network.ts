import { getIPRange } from 'get-ip-range';

interface IpConfig {
  leaseTime: number;
  ipv4: {
    ip: string;
    subnetmask: string;
    gateway: string | null;
  };
}

type IpRange = { from: string; to: string };

const dhcpServers: DHCPServer[] = [];
const clients: Client[] = [];

class DHCPServer {
  //  TODO: Add cleanup method to dhcp class
  public name: string;
  public ownIp: string;
  private ipRange: IpRange;
  private leaseTime: number;
  private subnetMask: string;
  public leases: IpConfig[] = [];

  constructor(name: string, ownIp: string, ipRange: IpRange, leaseTime: number, subnetMask: string) {
    this.name = name;
    this.ownIp = ownIp;
    this.ipRange = ipRange;
    this.leaseTime = leaseTime;
    this.subnetMask = subnetMask;
    console.log(`Created new dhcp-server with the name ${name} and the ip ${ownIp}`);
    dhcpServers.push(this);
  }

  public getIpConfig(): IpConfig | undefined {
    const ipList = getIPRange(this.ipRange.from, this.ipRange.to);
    for (const ip of ipList) {
      if (this.leases.filter(lease => lease.ipv4.ip === ip).length === 0) {
        console.log(`Found unused ip: ${ip}`);
        const ipConfig: IpConfig = {
          leaseTime: this.leaseTime,
          ipv4: {
            gateway: null,
            subnetmask: this.subnetMask,
            ip: ip,
          },
        };
        this.leases.push(ipConfig);
        return ipConfig;
      }
    }
    console.log('There is no unused ip address');
  }
}

class Client {
  public name: string;
  public ipConfig: IpConfig | undefined = undefined;
  private leaseCheckInterval: number;

  constructor(name: string, leaseCheckInterval: number) {
    this.name = name;
    this.leaseCheckInterval = leaseCheckInterval;

    setInterval(() => {
      this.checkLease();
    }, this.leaseCheckInterval);
    console.log(`Created new client with the name ${name}`);
    clients.push(this);
  }

  public getIpConfig(): void {
    if (dhcpServers.length === 0) return console.log('No DHCP Server found in the network!');
    const dhcp = dhcpServers[0];
    console.log(`Requesting network Configuration from Server ${dhcp.name}`);

    const newIpConfig = dhcp.getIpConfig();
    if (newIpConfig) {
      console.log(`Received new ipconfig. ip: ${newIpConfig.ipv4.ip}`);
      this.ipConfig = newIpConfig;
    }
  }

  private checkLease() {
    if (this.ipConfig === undefined) return;

    console.log('Checking lease Time');
    console.log(this.ipConfig.leaseTime);
    this.ipConfig.leaseTime -= this.leaseCheckInterval;

    if (this.ipConfig.leaseTime <= 0) {
      console.log('Lease time expired - getting new ip-configuration!');
      this.getIpConfig();
    }
  }
}

// * Example

const client01 = new Client('client01', 1000 * 3);

const dhcp01 = new DHCPServer(
  'dhcp01',
  '192.168.0.254',
  { from: '192.168.0.1', to: '192.168.0.20' },
  1000 * 20,
  '255.255.255.0'
);

client01.getIpConfig();
