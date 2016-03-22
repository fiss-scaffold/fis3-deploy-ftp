# fis3-deploy-ftp
fis3 ftp deploy plugin,将代码通过ftp的方式上传到ftp服务器，支持include/exclude选项，支持不同的路径上传到不同的ftp服务器。

本插件参考了fis-deploy-ftp插件的代码，进行了一些修改。


## 使用方法
下面的配置满足的需求是：
>要把所有文件除了/img/下的文件，通过ftp部署到`xxx.xxx.xxx.1`的远程路径`/remote/dir/to/upload/dir1/`下面；
>然后把/img/下的文件通过ftp部署到`xxx.xxx.xxx.2`的远程路径`/remote/dir/to/upload/dir2/`下面；

```
fis.match('*', {
    deploy: [
        fis.plugin('ftp', {
        	//是否打印调试信息的开关
          //'console':true,
          //ftp远程目录
          remoteDir : '/remote/dir/to/upload/dir1/',
          //排除不上传的文件路径
          exclude:['/img/'],
          //需要上传的文件路径，一般情况不用配置include，默认是全部
          //include:['/js/','/css/'],
          //ftp的配置信息
          connect : {
              host : 'xxx.xxx.xxx.1',//ftp1 ip 
              port : '21',//ftp端口
              user : 'ftp username',
              password : 'ftp password'
          }
        }),
        fis.plugin('ftp', {
            //'console':true,
            remoteDir : '/remote/dir/to/upload/dir2/',,
            include:['/img/'],
            connect : {
                host : 'xxx.xxx.xxx.2',,
                port : '21',
                user : 'ftp username',
              	password : 'ftp password'
            }
        })
    ]
});
```

