
import numpy as np


def to_ndsp_file(data, labels=None, title="untitled", dimAx=0, afAx=None):

    # move from torch to numpy if not already done
    if not type(data) == np.ndarray:
        data = data.detach().np()
    
    # get the dimension indices
    axes = list(range(data.ndim))
    
    # move dimension vals to end
    axes.remove(dimAx)
    axes.append(dimAx)
    
    # move animation frames to start
    if not afAx is None:
        axes.remove(afAx)
        axes.insert(0,afAx)
    
    # reshape data
    transposed_data = np.transpose(data, axes=axes)
    shape = transposed_data.shape
    if not afAx is None:
        reshaped_data = transposed_data.reshape([shape[0],-1,shape[-1]])
    else:
        reshaped_data = transposed_data.reshape([-1,shape[-1]])

    # get shape info for flname
    shape = reshaped_data.shape
    if afAx is None:
        af = 1
    else:
        af = shape[0]
    dp = shape[-2]
    dim = shape[-1]

    # save data
    flname = f"{title}._{af}af_{dp}dp_{dim}dim_.bin"
    reshaped_data.tofile(flname)

    # save labels if any
    if not labels is None:
        if labels=="zeros":
            labels = np.zeros(dp,dtype=np.uint8)
        
        flname = f"{title}_labels._{af}af_{dp}dp_{dim}dim_.bin"
        labels.tofile(flname)
            

