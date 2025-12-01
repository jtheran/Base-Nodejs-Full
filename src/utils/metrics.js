import os from "os";
import osu from "os-utils";
import checkDiskSpace from "check-disk-space";
import { auditLogger, logger } from '../logs/logger.js';


export const getServerMetrics = async (req, res) => {
  try {
    osu.cpuUsage(async (cpuPercent) => {
      const totalMem = os.totalmem() / 1024 / 1024; // MB
      const freeMem = os.freemem() / 1024 / 1024;
      const usedMem = totalMem - freeMem;
      const uptime = os.uptime();
      const loadAverage = os.loadavg();

      // ✅ Detecta la ruta del disco según el sistema operativo
      const diskPath = os.platform() === "win32" ? "C:\\" : "/";

      const diskInfo = await checkDiskSpace(diskPath);
      const freeDisk = diskInfo.free / 1024 / 1024 / 1024;
      const totalDisk = diskInfo.size / 1024 / 1024 / 1024;
      auditLogger.log('audit', {
          message: 'Metricas del Sistema',
          action: 'STATS',
          entity: user.role,
          entityId: user.id,
          userId: user.id,
          userIp: getClientIp(req),
          userAgent: req.get('User-Agent'),
          metadata: {
              user: userResponse,
              loginMethod: 'email and password'
          }
      });
      return res.status(200).json({
        cpuUsage: `${(cpuPercent * 100).toFixed(2)}%`,
        memory: {
          total: `${totalMem.toFixed(2)} MB`,
          used: `${usedMem.toFixed(2)} MB`,
          free: `${freeMem.toFixed(2)} MB`,
        },
        disk: {
          total: `${totalDisk.toFixed(2)} GB`,
          free: `${freeDisk.toFixed(2)} GB`,
        },
        uptime: `${(uptime / 60).toFixed(2)} minutes`,
        loadAverage,
      });
    });
  } catch (error) {
    return res.status(500).json({ message: "Error fetching metrics", error });
  }
};
